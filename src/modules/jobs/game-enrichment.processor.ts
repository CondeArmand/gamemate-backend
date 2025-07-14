import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { isBefore, subDays } from 'date-fns';
import { performance } from 'perf_hooks';
import { Prisma, Provider } from '@prisma/client';
import { GameRepository } from '../../repositories/game.repository';
import { UserOwnedGameRepository } from '../../repositories/user-owned-game.repository';
import { GamesService } from '../games/games.service';
import { SteamGridDbService } from '../steamgriddb/steamgriddb.service';
import { SteamService } from '../steam/steam.service';
import { SteamGameDetails } from '../steam/types/steamTypes';
import { parseSteamDate } from './helpers/date-parser.helper';

interface EnrichGameJobData {
  userId: string;
  steamAppId: number;
  steamGameName: string;
  playtime: number;
}

type EnrichedData = Omit<Prisma.GameCreateInput, 'name'> & { name: string };

@Processor('game-enrichment')
export class GameEnrichmentProcessor {
  private readonly logger = new Logger(GameEnrichmentProcessor.name);

  constructor(
    private readonly steamService: SteamService,
    private readonly gamesService: GamesService,
    private readonly steamGridDbService: SteamGridDbService,
    private readonly gameRepository: GameRepository,
    private readonly userOwnedGameRepository: UserOwnedGameRepository,
  ) {}

  @Process('enrich-single-game')
  async handleEnrichGame(job: Job<EnrichGameJobData>) {
    const startTime = performance.now();
    const { steamAppId, steamGameName } = job.data;

    // 1. Tenta executar o "caminho rápido" (fast path).
    const fastPathSuccess = await this.handleFastPath(job.data);
    if (fastPathSuccess) {
      const endTime = performance.now();
      this.logger.debug(
        `[Fast Path] Concluído para "${steamGameName}" em ${(endTime - startTime).toFixed(2)}ms`,
      );
      return;
    }

    // 2. Se o fast path não for aplicável, inicia o "caminho lento" (slow path).
    this.logger.log(
      `[Slow Path] Iniciando para: ${steamGameName} (${steamAppId})`,
    );

    // 3. Busca e consolida os dados de todas as fontes (Steam, IGDB).
    const enrichedData = await this.fetchAndConsolidateData(
      steamAppId.toString(),
      steamGameName,
    );
    if (!enrichedData) {
      this.logger.error(
        `[Slow Path] Falha ao obter dados para "${steamGameName}". Salvando dados mínimos.`,
      );
      await this.persistMinimalGameData(job.data);
      return;
    }

    // 4. Busca a melhor arte de capa em uma cascata de fontes.
    const dataWithCover = await this.fetchBestCoverArt(enrichedData);

    // 5. Salva os dados finais no banco.
    await this.persistEnrichedGameData(dataWithCover, job.data);

    const endTime = performance.now();
    this.logger.log(
      `[Slow Path] Concluído para "${dataWithCover.name}" em ${(endTime - startTime).toFixed(2)}ms`,
    );
  }

  /**
   * Tenta executar a lógica de atualização rápida.
   * Retorna `true` se bem-sucedido, `false` caso contrário.
   */
  private async handleFastPath(data: EnrichGameJobData): Promise<boolean> {
    const existingGame = await this.gameRepository.findBySteamId(
      data.steamAppId.toString(),
    );
    if (!existingGame) return false;

    const staleThreshold = subDays(new Date(), 180); // Limite de 6 meses
    if (isBefore(existingGame.updatedAt, staleThreshold)) {
      return false; // Jogo está obsoleto, precisa de enriquecimento completo.
    }

    this.logger.log(
      `[Fast Path] Jogo "${existingGame.name}" já está atualizado.`,
    );
    await this.userOwnedGameRepository.upsert(
      data.userId,
      existingGame.id,
      data.playtime,
      Provider.STEAM,
    );
    return true;
  }

  /**
   * Orquestra a busca de dados em cascata: Steam primeiro, depois IGDB.
   * Retorna um objeto de dados consolidado ou null se todas as fontes falharem.
   */
  private async fetchAndConsolidateData(
    steamAppId: string,
    steamGameName: string,
  ): Promise<EnrichedData | null> {
    const steamDetails = await this.steamService.getGameDetails(steamAppId);
    if (steamDetails) {
      return this.consolidateFromSteam(steamDetails);
    }

    // Fallback para IGDB se a Steam falhar.
    this.logger.warn(
      `Detalhes da Steam não encontrados para ${steamAppId}. Tentando IGDB por nome.`,
    );
    const igdbGame = await this.gamesService.findBestMatchByName(steamGameName);
    if (igdbGame) {
      return { steamAppId, ...this.gamesService.formatIgdbGameData(igdbGame) };
    }

    return null;
  }

  /**
   * Consolida os dados, usando a Steam como fonte principal e a IGDB como complementar.
   */
  private async consolidateFromSteam(
    steamDetails: SteamGameDetails,
  ): Promise<EnrichedData> {
    const baseData: EnrichedData = {
      steamAppId: steamDetails.steam_appid.toString(),
      name: steamDetails.name,
      summary: steamDetails.about_the_game,
      developers: steamDetails.developers || [],
      publishers: steamDetails.publishers || [],
      genres: steamDetails.genres?.map((g) => g.description) || [],
      releaseDate: parseSteamDate(steamDetails.release_date?.date || ''),
      screenshots: steamDetails.screenshots?.map((s) => s.path_full) || [],
    };

    if (baseData.steamAppId) {
      const igdbGame = await this.gamesService.findGameBySteamId(
        baseData.steamAppId,
      );

      if (igdbGame) {
        const formattedIgdb = this.gamesService.formatIgdbGameData(igdbGame);
        baseData.igdbId = formattedIgdb.igdbId;
        baseData.rating = formattedIgdb.rating;
        baseData.developers ??= formattedIgdb.developers;
        baseData.publishers ??= formattedIgdb.publishers;
        baseData.screenshots ??= formattedIgdb.screenshots;
      }
    }

    return baseData;
  }

  /**
   * Busca a melhor URL de capa em uma cascata de fontes.
   */
  private async fetchBestCoverArt(
    gameData: EnrichedData,
  ): Promise<EnrichedData> {
    // 1. SteamGridDB (melhor qualidade)
    let coverUrl: string | null = null;
    if (gameData.steamAppId) {
      coverUrl = await this.steamGridDbService.getCoverBySteamAppId(
        gameData.steamAppId,
      );
    }
    if (coverUrl) {
      this.logger.debug(
        `Capa encontrada para "${gameData.name}" no SteamGridDB.`,
      );
      return { ...gameData, coverUrl };
    }

    // 2. IGDB (se já tivermos os dados)
    if (gameData.igdbId) {
      const igdbGame = await this.gamesService.findGameByIgdbId(
        gameData.igdbId,
      );
      coverUrl =
        igdbGame?.cover?.url?.replace('t_thumb', 't_cover_big_2x') ?? null;
      if (coverUrl) {
        this.logger.debug(`Capa encontrada para "${gameData.name}" na IGDB.`);
        return { ...gameData, coverUrl };
      }
    }

    // 3. Fallback para imagem da Steam
    if (gameData.steamAppId) {
      const steamDetails = await this.steamService.getGameDetails(
        gameData.steamAppId,
      );
      if (steamDetails?.header_image) {
        this.logger.warn(
          `Usando capa fallback (header) da Steam para "${gameData.name}".`,
        );
        return { ...gameData, coverUrl: steamDetails.header_image };
      }
    }

    return gameData;
  }

  /**
   * Persiste os dados totalmente enriquecidos no banco de dados.
   */
  private async persistEnrichedGameData(
    gameData: EnrichedData,
    jobData: EnrichGameJobData,
  ): Promise<void> {
    const gameInDb = await this.gameRepository.smartUpsert(gameData);
    await this.userOwnedGameRepository.upsert(
      jobData.userId,
      gameInDb.id,
      jobData.playtime,
      Provider.STEAM,
    );
  }

  /**
   * Persiste apenas os dados mínimos quando todas as fontes de enriquecimento falham.
   */
  private async persistMinimalGameData(
    jobData: EnrichGameJobData,
  ): Promise<void> {
    const minimalData = {
      steamAppId: jobData.steamAppId.toString(),
      name: jobData.steamGameName,
    };
    const gameInDb = await this.gameRepository.smartUpsert(minimalData);
    await this.userOwnedGameRepository.upsert(
      jobData.userId,
      gameInDb.id,
      jobData.playtime,
      Provider.STEAM,
    );
  }
}
