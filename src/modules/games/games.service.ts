import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Usaremos ConfigService para as variáveis de ambiente
import { firstValueFrom } from 'rxjs';
import { TwitchToken, IGDBGame } from './types/igdb.types';
import stringSimilarity from 'string-similarity';

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);
  private token: TwitchToken | null = null;
  private tokenExpiryTime: number = 0;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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
  async searchGamesByName(searchTerm: string): Promise<IGDBGame[]> {
    const accessToken = await this.getAccessToken();
    const clientId = this.configService.get<string>('IGDB_CLIENT_ID');

    const query = `
         fields 
        name, summary, cover.url, first_release_date, total_rating, 
        genres.name, platforms.name, screenshots.url, 
        involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
         search "${searchTerm}";
         where cover.url != null & total_rating != null & summary != null & screenshots.url != null;
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

      return response.data.map((game) => this.formatGameData(game));
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
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        'Falha ao buscar dados dos jogos de destaque.',
      );
    }
  }

  async findGameBySteamId(steamAppId: string): Promise<IGDBGame | null> {
    const accessToken = await this.getAccessToken();
    const clientId = this.configService.get<string>('IGDB_CLIENT_ID');

    // Query APICalypse para buscar por um website da categoria 'steam' (id 13)
    // que corresponda ao appid.
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
        error.response?.data || error.message,
      );
      return null; // Retorna null em caso de erro para a cascata continuar
    }
  }

  /**
   * Encapsula a lógica de "fuzzy matching" para encontrar a melhor correspondência de jogo
   * a partir de uma lista de resultados da IGDB.
   * @param gameName O nome do jogo vindo da Steam.
   * @returns O objeto do jogo com a melhor correspondência se a pontuação for boa, caso contrário null.
   */
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

  /**
   * Busca os detalhes de um jogo na IGDB usando o seu ID único da IGDB.
   * Útil para re-carregar dados ou para fallbacks.
   * @param igdbId O ID do jogo na plataforma IGDB.
   * @returns O objeto do jogo da IGDB se encontrado, caso contrário null.
   */
  async findGameByIgdbId(igdbId: string): Promise<IGDBGame | null> {
    const accessToken = await this.getAccessToken();
    const clientId = this.configService.get<string>('IGDB_CLIENT_ID');

    // Query APICalypse para buscar por um ID específico.
    // Pedimos todos os campos ricos que definimos no nosso tipo IGDBGame.
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
        error.response?.data || error.message,
      );
      // Retorna null em caso de erro para que o fluxo do worker possa continuar.
      return null;
    }
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
