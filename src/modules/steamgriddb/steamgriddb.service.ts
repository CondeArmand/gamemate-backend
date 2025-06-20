import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

// Interface para a resposta da API do SteamGridDB
interface SteamGridDbResponse {
  success: boolean;
  data: {
    id: number;
    url: string;
    // ... outros campos de imagem
  }[];
}

@Injectable()
export class SteamGridDbService {
  private readonly logger = new Logger(SteamGridDbService.name);
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://www.steamgriddb.com/api/v2';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('STEAMGRIDDB_API_KEY');
    if (!this.apiKey) {
      throw new Error(
        'STEAMGRIDDB_API_KEY não está definida nas variáveis de ambiente.',
      );
    }
  }

  /**
   * Busca a URL da melhor capa (grid) para um jogo usando seu Steam AppID.
   * @param steamAppId O ID do aplicativo do jogo na Steam.
   * @returns A URL da imagem ou null se não for encontrada.
   */
  async getCoverBySteamAppId(steamAppId: string): Promise<string | null> {
    if (!steamAppId || steamAppId.trim() === '') {
      this.logger.warn(
        `Tentativa de buscar capa com um steamAppId inválido: "${steamAppId}"`,
      );
      return null; // Retorna nulo e não prossegue
    }
    const url = `${this.baseUrl}/grids/steam/${steamAppId}`;
    this.logger.debug(
      `Buscando capa no SteamGridDB para o AppID: ${steamAppId}`,
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get<SteamGridDbResponse>(url, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }),
      );

      if (response.data.success && response.data.data.length > 0) {
        // A API geralmente retorna as melhores ou mais populares primeiro
        return response.data.data[0].url;
      }

      return null; // Nenhuma imagem encontrada
    } catch (error) {
      // A API do SteamGridDB retorna 404 se não encontrar, o que causa um erro no axios.
      // Tratamos isso como "não encontrado" em vez de um erro crítico do sistema.
      if (error.response?.status === 404) {
        this.logger.debug(
          `Nenhuma capa encontrada no SteamGridDB para o AppID: ${steamAppId}`,
        );
      } else {
        this.logger.error(
          `Erro ao buscar capa no SteamGridDB para o AppID ${steamAppId}`,
          error.stack,
        );
      }
      return null;
    }
  }
}
