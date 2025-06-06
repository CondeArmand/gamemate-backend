import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Usaremos ConfigService para as variáveis de ambiente
import { firstValueFrom } from 'rxjs';

interface TwitchToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

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
    // Se temos um token e ele ainda não expirou, use-o
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
      // Define o tempo de expiração com uma pequena margem de segurança (ex: 60s)
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
  async searchGamesByName(searchTerm: string) {
    const accessToken = await this.getAccessToken();
    const clientId = this.configService.get<string>('IGDB_CLIENT_ID');

    // Query APICalypse para buscar jogos por nome e trazer campos essenciais
    const query = `
       fields name, summary, cover.url, first_release_date, total_rating, genres.name, platforms.abbreviation;
       search "${searchTerm}";
       where cover.url != null & total_rating != null;
       limit 20;
     `;

    try {
      const response = await firstValueFrom(
        this.httpService.post('https://api.igdb.com/v4/games', query, {
          headers: {
            'Client-ID': clientId,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'text/plain', // IGDB espera APICalypse como texto
          },
        }),
      );
      // Ajusta a URL da capa para ter uma melhor qualidade
      return response.data.map((game: any) => ({
        ...game,
        cover: {
          ...game.cover,
          url: game.cover.url.replace('t_thumb', 't_cover_big'),
        },
      }));
    } catch (error) {
      this.logger.error(
        `Falha ao buscar jogos para o termo "${searchTerm}"`,
        error.response?.data || error.message,
      );
      throw new InternalServerErrorException(
        'Falha ao buscar dados dos jogos.',
      );
    }
  }

  async getFeaturedGames() {
    const accessToken = await this.getAccessToken();
    const clientId = this.configService.get<string>('IGDB_CLIENT_ID');

    // Query APICalypse para buscar jogos de destaque.
    // Condições: Lançado nos últimos 6 meses, nota > 80, mais de 50 avaliações, com capa e screenshots.
    // Ordenado pela maior nota.
    const sixMonthsAgoTimestamp = Math.floor(
      Date.now() / 1000 - 60 * 60 * 24 * 180,
    );
    const query = `
        fields name, summary, cover.url, screenshots.url, total_rating;
        where first_release_date > ${sixMonthsAgoTimestamp} & total_rating > 80 & total_rating_count > 50 & cover.url != null & screenshots.url != null;
        sort total_rating desc;
        limit 15;
      `;

    this.logger.log('Buscando jogos de destaque na IGDB...');
    try {
      const response = await firstValueFrom(
        this.httpService.post('https://api.igdb.com/v4/games', query, {
          headers: {
            'Client-ID': clientId,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'text/plain',
          },
        }),
      );
      // Ajusta as URLs de capa e screenshots para ter uma melhor qualidade
      return response.data.map((game: any) => ({
        ...game,
        cover: {
          ...game.cover,
          url: game.cover.url.replace('t_thumb', 't_cover_big'),
        },
        screenshots: game.screenshots.map((ss: any) => ({
          ...ss,
          url: ss.url.replace('t_thumb', 't_screenshot_huge'),
        })),
      }));
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
}
