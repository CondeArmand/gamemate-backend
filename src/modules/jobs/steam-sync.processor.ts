import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { SteamService } from '../steam/steam.service';

@Processor('game-sync')
export class SteamSyncProcessor {
  private readonly logger = new Logger(SteamSyncProcessor.name);

  constructor(
    private readonly steamService: SteamService,
    @InjectQueue('game-enrichment') private readonly enrichmentQueue: Queue,
  ) {}

  @Process('sync-steam-games')
  async handleSyncSteamGames(job: Job<{ userId: string; steamId: string }>) {
    const { userId, steamId } = job.data;
    this.logger.log(
      `Orquestrador: Iniciando busca de jogos para o usuário: ${userId}`,
    );

    const steamLibrary = await this.steamService.getOwnedGames(steamId);
    if (!steamLibrary || steamLibrary.game_count === 0) {
      this.logger.log(`Orquestrador: Nenhum jogo encontrado.`);
      return;
    }

    this.logger.log(
      `Orquestrador: ${steamLibrary.game_count} jogos encontrados. Disparando jobs individuais...`,
    );

    for (const game of steamLibrary.games) {
      if (game.name) {
        await this.enrichmentQueue.add('enrich-single-game', {
          userId: userId,
          steamAppId: game.appid,
          steamGameName: game.name,
          playtime: game.playtime_forever,
        });
      }
    }
    this.logger.log(
      `Orquestrador: ${steamLibrary.games.length} jobs de enriquecimento disparados.`,
    );
  }
}
