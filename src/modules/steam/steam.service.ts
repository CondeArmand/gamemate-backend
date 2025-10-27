import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  SteamAppDetailsResponse,
  SteamGameDetails,
  SteamOwnedGamesResponse,
} from './types/steamTypes';

// Interface para a resposta da API de jogos da Steam

@Injectable()
export class SteamService {
  private readonly logger = new Logger(SteamService.name);
  private readonly apiKey: string | undefined;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('STEAM_API_KEY');
    if (!this.apiKey) {
      throw new Error(
        'STEAM_API_KEY não está definida nas variáveis de ambiente.',
      );
    }
  }

  async getGameDetails(appid: string): Promise<SteamGameDetails | null> {
    const url = `https://store.steampowered.com/api/appdetails`;
    this.logger.debug(
      `Buscando detalhes para o appid: ${appid} na Steam Storefront API`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get<SteamAppDetailsResponse>(url, {
          params: { appids: appid },
        }),
      );

      const gameData = response.data[appid];

      if (gameData?.data && gameData.success) {
        return gameData.data;
      }

      this.logger.warn(
        `Não foi possível obter dados bem-sucedidos para o appid: ${appid}`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Falha ao buscar detalhes do jogo ${appid} na API da Steam`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Busca a lista de jogos que um usuário possui na Steam.
   * @param steamId O ID de 64 bits do usuário na Steam.
   */
  async getOwnedGames(
    steamId: string,
  ): Promise<SteamOwnedGamesResponse['response']> {
    this.logger.debug(this.apiKey);
    const url =
      'https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/';

    try {
      const response = await firstValueFrom(
        this.httpService.get<SteamOwnedGamesResponse>(url, {
          params: {
            key: this.apiKey,
            steamid: steamId,
            format: 'json',
            include_appinfo: true,
            include_played_free_games: false,
          },
        }),
      );

      if (response.data && response.data.response) {
        return response.data.response;
      }
      // Se a resposta for vazia ou o perfil for privado, retorna um objeto vazio
      this.logger.warn(
        `Resposta da Steam para getOwnedGames não continha dados para o steamId: ${steamId}. O perfil pode ser privado.`,
      );
      return { game_count: 0, games: [] };
    } catch (error) {
      this.logger.error(
        `Falha ao buscar jogos da Steam para o steamId: ${steamId}`,
        error.stack,
      );

      if (error.response) {
        this.logger.error('Detalhes do erro da API da Steam:', {
          status: error.response.status,
          data: error.response.data,
        });
      }

      throw new InternalServerErrorException(
        'Falha ao comunicar com a API da Steam.',
      );
    }
  }
}
