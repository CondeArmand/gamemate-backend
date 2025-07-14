import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Usaremos ConfigService para as variáveis de ambiente
import { firstValueFrom } from 'rxjs';
import { TwitchToken, IGDBGame, IGDBInvolvedCompany } from './types/igdb.types';
import stringSimilarity from 'string-similarity';
import { GameRepository } from '../../repositories/game.repository';
import { UserOwnedGameRepository } from '../../repositories/user-owned-game.repository';
import { Game, Prisma } from '@prisma/client';

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);
  private token: TwitchToken | null = null;
  private tokenExpiryTime: number = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly gameRepository: GameRepository,
    private readonly userOwnedGameRepository: UserOwnedGameRepository,
  ) {}

  private async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiryTime) {
      return this.token.access_token;
    }

    this.logger.log('Gerando novo token de acesso da Twitch...');
    const clientId = this.configService.get<string>('IGDB_CLIENT_ID');
    const clientSecret = this.configService.get<string>('IGDB_CLIENT_SECRET');
    const url = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<TwitchToken>(url),
      );
      this.token = response.data;

      this.tokenExpiryTime = Date.now() + (this.token.expires_in - 60) * 1000;
      this.logger.log('Novo token de acesso gerado com sucesso.');
      return this.token.access_token;
    } catch (error) {
      this.logger.error('Falha ao obter token de acesso da Twitch', error);
      throw new InternalServerErrorException(
        'Não foi possível autenticar com o serviço de jogos.',
      );
    }
  }

  /**
   * Busca jogos na API da IGDB.
   * @param searchTerm Termo de busca para os jogos.
   */
  async searchGamesByName(searchTerm: string): Promise<any[]> {
    const accessToken = await this.getAccessToken();
    const clientId = this.configService.get<string>('IGDB_CLIENT_ID');

    const query = `
      fields 
        name, summary, cover.url, first_release_date, total_rating, 
        genres.name, platforms.name, screenshots.url, 
        involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      search "${searchTerm}";
      where cover.url != null & summary != null;
      limit 20;
    `;

    try {
      const response = await firstValueFrom(
        this.httpService.post<IGDBGame[]>(
          'https://api.igdb.com/v4/games',
          query,
          {
            headers: {
              'Client-ID': clientId,
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'text/plain',
            },
          },
        ),
      );

      if (!Array.isArray(response.data)) {
        this.logger.warn(
          `A resposta da IGDB para o termo "${searchTerm}" não foi um array. Retornando array vazio.`,
          response.data,
        );
        return [];
      }

      return response.data.map((game) => this.formatIgdbGameData(game));
    } catch (error) {
      this.logger.error(
        `Falha ao buscar jogos para o termo "${searchTerm}"`,
        error.message,
      ); // Loga a mensagem do erro original
      throw new InternalServerErrorException(
        'Falha ao buscar dados dos jogos.',
      );
    }
  }

  async getFeaturedGames(): Promise<IGDBGame[]> {
    const accessToken = await this.getAccessToken();
    const clientId = this.configService.get<string>('IGDB_CLIENT_ID');

    // Query APICalypse para buscar jogos de destaque.
    // Condições: Lançado nos últimos 6 meses, nota > 80, mais de 50 avaliações, com capa e screenshots.
    // Ordenado pela maior nota.
    const sixMonthsAgoTimestamp = Math.floor(
      Date.now() / 1000 - 60 * 60 * 24 * 180,
    );
    const query = `
        fields 
        name, summary, cover.url, first_release_date, total_rating, 
        genres.name, platforms.name, screenshots.url, 
        involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
        where first_release_date > ${sixMonthsAgoTimestamp} & total_rating > 80 & total_rating_count > 50 & cover.url != null & screenshots.url != null;
        sort total_rating desc;
        limit 15;
      `;

    this.logger.log('Buscando jogos de destaque na IGDB...');
    try {
      const response = await firstValueFrom(
        this.httpService.post<IGDBGame[]>(
          'https://api.igdb.com/v4/games',
          query,
          {
            headers: {
              'Client-ID': clientId,
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'text/plain',
            },
          },
        ),
      );
      // Ajusta as URLs de capa e screenshots para ter uma melhor qualidade
      return response.data.map((game) => this.formatGameData(game));
    } catch (error) {
      this.logger.error(
        `Falha ao buscar jogos de destaque`,
        error.response?.data ?? error.message,
      );
      throw new InternalServerErrorException(
        'Falha ao buscar dados dos jogos de destaque.',
      );
    }
  }

  async findGameBySteamId(steamAppId: string): Promise<IGDBGame | null> {
    const accessToken = await this.getAccessToken();
    const clientId = this.configService.get<string>('IGDB_CLIENT_ID');

    const query = `
      fields name, summary, cover.url, first_release_date, total_rating, genres.name, platforms.name, screenshots.url, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where websites.category = 13 & websites.url ~ *"/app/${steamAppId}";
      limit 1;
    `;

    try {
      this.logger.debug(
        `Buscando jogo na IGDB pelo Steam AppID: ${steamAppId}`,
      );
      const response = await firstValueFrom(
        this.httpService.post<IGDBGame[]>(
          'https://api.igdb.com/v4/games',
          query,
          {
            headers: {
              'Client-ID': clientId,
              Authorization: `Bearer ${accessToken}`,
            },
          },
        ),
      );

      // Se encontrar, retorna o primeiro (e único) resultado
      if (response.data && response.data.length > 0) {
        this.logger.log(
          `Correspondência exata encontrada na IGDB para o Steam AppID ${steamAppId}: "${response.data[0].name}"`,
        );
        return response.data[0];
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Falha ao buscar jogo por Steam AppID "${steamAppId}"`,
        error.response?.data ?? error.message,
      );
      return null; // Retorna null em caso de erro para a cascata continuar
    }
  }

  async findBestMatchByName(gameName: string): Promise<IGDBGame | null> {
    // Primeiro, fazemos a busca geral pelo nome
    const searchResults = await this.searchGamesByName(gameName);

    if (!searchResults || searchResults.length === 0) {
      return null; // Não há resultados para comparar
    }

    const steamGameName = gameName.toLowerCase();
    const igdbGameNames = searchResults.map((game) => game.name.toLowerCase());

    // Encontra a melhor correspondência no array de nomes
    const bestMatch = stringSimilarity.findBestMatch(
      steamGameName,
      igdbGameNames,
    );

    this.logger.debug(
      `Fuzzy match para "${gameName}": melhor correspondência é "${bestMatch.bestMatch.target}" com pontuação ${bestMatch.bestMatch.rating.toFixed(2)}`,
    );

    // Consideramos uma boa correspondência se a pontuação for > 0.7 (70%)
    if (bestMatch.bestMatch.rating > 0.7) {
      const bestMatchIndex = bestMatch.bestMatchIndex;
      return searchResults[bestMatchIndex]; // Retorna o objeto de jogo completo
    }

    // Se a pontuação for muito baixa, consideramos que não houve uma boa correspondência
    return null;
  }

  async findGameByIgdbId(igdbId: string): Promise<IGDBGame | null> {
    const accessToken = await this.getAccessToken();
    const clientId = this.configService.get<string>('IGDB_CLIENT_ID');

    const query = `
      fields name, summary, cover.url, first_release_date, total_rating, 
      genres.name, platforms.name, screenshots.url, 
      involved_companies.company.name, involved_companies.developer, 
      involved_companies.publisher;
      where id = ${igdbId};
      limit 1;
    `;

    try {
      this.logger.debug(`Buscando jogo na IGDB pelo IGDB ID: ${igdbId}`);
      const response = await firstValueFrom(
        this.httpService.post<IGDBGame[]>(
          'https://api.igdb.com/v4/games',
          query,
          {
            headers: {
              'Client-ID': clientId,
              Authorization: `Bearer ${accessToken}`,
            },
          },
        ),
      );

      // Se a busca retornar um resultado, retorna o primeiro (e único) objeto do array.
      if (response.data && response.data.length > 0) {
        return response.data[0];
      }

      this.logger.warn(`Nenhum jogo encontrado na IGDB com o ID: ${igdbId}`);
      return null;
    } catch (error) {
      this.logger.error(
        `Falha ao buscar jogo por IGDB ID "${igdbId}"`,
        error.response?.data ?? error.message,
      );
      // Retorna null em caso de erro para que o fluxo do worker possa continuar.
      return null;
    }
  }

  async resolveGame(query: {
    igdbId?: string;
    steamAppId?: string;
  }): Promise<{ id: string }> {
    const { igdbId, steamAppId } = query;

    if (igdbId) {
      let game = await this.gameRepository.findByIgdbId(igdbId);
      if (game) {
        return { id: game.id };
      }

      game = await this.enrichAndCreateFromIgdb(igdbId);

      if (!game) {
        throw new NotFoundException(
          `Jogo com IGDB ID ${igdbId} não encontrado na fonte externa.`,
        );
      }
      return { id: game.id };
    } else if (steamAppId) {
      const game = await this.gameRepository.findBySteamId(steamAppId);
      if (!game) {
        throw new NotFoundException(
          `Jogo com Steam AppID ${steamAppId} não encontrado em nosso banco.`,
        );
      }
      return { id: game.id };
    }

    throw new BadRequestException(
      'É necessário fornecer um igdbId ou steamAppId.',
    );
  }

  async findGameDetails(gameId: string, userId?: string) {
    const game = await this.gameRepository.findById(gameId);

    const response: any = { ...game };
    response.isOwned = false;

    if (userId) {
      const userOwnedGame =
        await this.userOwnedGameRepository.findByUserIdAndGameId(
          userId,
          gameId,
        );

      if (userOwnedGame) {
        response.isOwned = true;
        response.playtimeMinutes = userOwnedGame.playtimeMinutes;
      }
    }

    return response;
  }

  private async enrichAndCreateFromIgdb(igdbId: string): Promise<Game | null> {
    this.logger.log(
      `[Resolve] Jogo com IGDB ID ${igdbId} não encontrado localmente. Buscando na IGDB...`,
    );
    const igdbGame = await this.findGameByIgdbId(igdbId); // Método que já tínhamos
    if (!igdbGame) return null;

    // Lógica de enriquecimento simplificada
    const gameData: Prisma.GameCreateInput = {
      igdbId: igdbGame.id.toString(),
      name: igdbGame.name,
      summary: igdbGame.summary,
      rating: igdbGame.total_rating,
      releaseDate: igdbGame.first_release_date
        ? new Date(igdbGame.first_release_date * 1000)
        : null,
      genres: igdbGame.genres?.map((g) => g.name) || [],
      platforms: igdbGame.platforms?.map((p) => p.name) || [],
      // Tenta buscar a capa
      coverUrl: igdbGame.cover?.url?.replace('t_thumb', 't_cover_big') || null,
    };

    // Salva no banco usando o smartUpsert para evitar duplicatas
    return this.gameRepository.smartUpsert(gameData);
  }

  public formatIgdbGameData(game: IGDBGame) {
    const { developers, publishers } = this.parseInvolvedCompanies(
      game.involved_companies,
    );

    return {
      igdbId: game.id.toString(),
      name: game.name,
      summary: game.summary,
      coverUrl: game.cover?.url.replace('t_thumb', 't_cover_big_2x'),
      rating: game.total_rating,
      releaseDate: game.first_release_date
        ? new Date(game.first_release_date * 1000)
        : null,
      genres: game.genres?.map((g) => g.name) || [],
      platforms: game.platforms?.map((p) => p.name) || [],
      screenshots:
        game.screenshots?.map((s) =>
          s.url.replace('t_thumb', 't_screenshot_huge'),
        ) || [],
      developers,
      publishers,
    };
  }

  private parseInvolvedCompanies(companies: IGDBInvolvedCompany[]): {
    developers: string[];
    publishers: string[];
  } {
    if (!companies) {
      return { developers: [], publishers: [] };
    }
    const developers = companies
      .filter((c) => c.developer)
      .map((c) => c.company.name);
    const publishers = companies
      .filter((c) => c.publisher)
      .map((c) => c.company.name);
    return { developers, publishers };
  }

  private formatGameData(game: IGDBGame): IGDBGame {
    return {
      ...game,
      cover: {
        ...game.cover,
        url: game.cover.url.replace('t_thumb', 't_cover_big'),
      },
      screenshots: game.screenshots.map((ss) => ({
        ...ss,
        url: ss.url.replace('t_thumb', 't_screenshot_huge'),
      })),
    };
  }
}
