import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SteamService } from '../steam/steam.service';
import { GamesService } from '../games/games.service';
import { GameRepository } from '../../repositories/game.repository';
import { UserOwnedGameRepository } from '../../repositories/user-owned-game.repository';
import { parseSteamDate } from './helpers/date-parser.helper';
import { Prisma, Provider } from '@prisma/client';
import { SteamGridDbService } from '../steamgriddb/steamgriddb.service';
import { isBefore, subDays } from 'date-fns';

// Interface para os dados do job de enriquecimento
interface EnrichGameJobData {
  userId: string;
  steamAppId: number;
  steamGameName: string;
  playtime: number;
}

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
    const { userId, steamAppId, steamGameName, playtime } = job.data;
    const steamAppIdStr = steamAppId.toString();

    const existingGame = await this.gameRepository.findBySteamId(steamAppIdStr);
    const staleThreshold = subDays(new Date(), 180);

    // Condição para o "caminho rápido": o jogo existe e foi atualizado recentemente.
    if (existingGame && !isBefore(existingGame.updatedAt, staleThreshold)) {
      this.logger.log(
        `[Fast Path] Jogo "${existingGame.name}" já está atualizado. Pulando enriquecimento.`,
      );

      await this.userOwnedGameRepository.upsert(
        userId,
        existingGame.id,
        playtime,
        Provider.STEAM,
      );
      this.logger.debug(
        `Tempo de jogo atualizado para "${existingGame.name}".`,
      );
      return;
    }

    this.logger.debug(
      `Iniciando enriquecimento para: ${steamGameName} (${steamAppIdStr})`,
    );

    // Objeto que conterá os dados consolidados
    let finalGameData: Prisma.GameCreateInput;

    // --- ETAPA 1: FONTE PRIMÁRIA DE METADADOS (STEAM STORE API) ---
    const steamDetails = await this.steamService.getGameDetails(steamAppIdStr);

    if (!steamDetails) {
      this.logger.warn(
        `Não foi possível obter detalhes da Steam para "${steamGameName}". Pulando para busca na IGDB.`,
      );
      // Se a API da Steam falhar, tentaremos a IGDB como fonte principal
      const igdbGame =
        await this.gamesService.findBestMatchByName(steamGameName);
      if (!igdbGame) {
        this.logger.error(
          `Não foi possível encontrar "${steamGameName}" em nenhuma fonte principal. Salvando dados mínimos.`,
        );
        // Salva apenas os dados mínimos que temos
        const minimalGameData = {
          steamAppId: steamAppIdStr,
          name: steamGameName,
        };
        const gameInDb = await this.gameRepository.smartUpsert(minimalGameData);
        await this.userOwnedGameRepository.upsert(
          userId,
          gameInDb.id,
          playtime,
          Provider.STEAM,
        );
        return; // Finaliza o job para este jogo
      }
      finalGameData = {
        steamAppId: steamAppIdStr,
        igdbId: igdbGame.id.toString(),
        name: igdbGame.name,
        summary: igdbGame.summary,
        rating: igdbGame.total_rating,
        releaseDate: igdbGame.first_release_date
          ? new Date(igdbGame.first_release_date * 1000)
          : null,
        genres: igdbGame.genres?.map((g) => g.name) || [],
        platforms: igdbGame.platforms?.map((p) => p.name) || [],
      };
    } else {
      finalGameData = {
        steamAppId: steamAppIdStr,
        name: steamDetails.name,
        summary: steamDetails.about_the_game,
        developers: steamDetails.developers || [],
        publishers: steamDetails.publishers || [],
        genres: steamDetails.genres?.map((g) => g.description) || [],
        releaseDate: parseSteamDate(steamDetails.release_date?.date || ''),
      };

      // --- ETAPA 2: DADOS COMPLEMENTARES (IGDB) ---
      // Buscamos na IGDB para pegar dados que a Steam não tem, como a nota (rating).
      const igdbGame = await this.gamesService.findGameBySteamId(steamAppIdStr);
      if (igdbGame) {
        finalGameData.igdbId = igdbGame.id.toString();
        finalGameData.rating = igdbGame.total_rating;
      }
    }

    // --- ETAPA 3: ENRIQUECIMENTO DE ARTE (CASCATA DE CAPAS) ---
    let finalCoverUrl: string | null = null;
    // 3a. Tenta SteamGridDB (melhor qualidade)
    const steamGridCover =
      await this.steamGridDbService.getCoverBySteamAppId(steamAppIdStr);
    if (steamGridCover) {
      finalCoverUrl = steamGridCover;
      this.logger.debug(
        `Capa encontrada para "${finalGameData.name}" no SteamGridDB.`,
      );
    }
    // 3b. Fallback para a capa da IGDB (se já tivermos buscado)
    else if (finalGameData.igdbId) {
      const igdbGameWithCover = await this.gamesService.findGameByIgdbId(
        finalGameData.igdbId,
      ); // Supondo que você crie este método
      if (igdbGameWithCover?.cover?.url) {
        finalCoverUrl = igdbGameWithCover.cover.url.replace(
          't_thumb',
          't_cover_big',
        );
        this.logger.debug(
          `Capa encontrada para "${finalGameData.name}" na IGDB.`,
        );
      }
    }
    // 3c. Fallback final para a imagem de cabeçalho da Steam
    else if (steamDetails?.header_image) {
      finalCoverUrl = steamDetails.header_image;
      this.logger.warn(
        `Usando capa fallback (header) da Steam para "${finalGameData.name}".`,
      );
    }

    finalGameData.coverUrl = finalCoverUrl;

    // --- ETAPA 4: PERSISTÊNCIA ---
    // Salva os dados consolidados e enriquecidos no banco de dados
    const gameInDb = await this.gameRepository.smartUpsert(finalGameData);

    // Vincula o jogo ao usuário
    await this.userOwnedGameRepository.upsert(
      userId,
      gameInDb.id,
      playtime,
      Provider.STEAM,
    );

    this.logger.log(
      `Enriquecimento concluído com sucesso para: ${finalGameData.name}`,
    );
  }
}
