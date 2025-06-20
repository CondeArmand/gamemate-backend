import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SteamModule } from '../steam/steam.module';
import { SteamSyncProcessor } from './steam-sync.processor';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { GamesModule } from '../games/games.module';
import { GameEnrichmentProcessor } from './game-enrichment.processor';
import { SteamGridDbModule } from '../steamgriddb/steamgriddb.module';

const GAME_SYNC_QUEUE_NAME = 'game-sync';
const GAME_ENRICHMENT_QUEUE_NAME = 'game-enrichment';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: GAME_SYNC_QUEUE_NAME,
      },
      { name: GAME_ENRICHMENT_QUEUE_NAME },
    ),
    // 3. Informa ao Bull Board sobre esta fila específica
    BullBoardModule.forFeature(
      {
        name: GAME_SYNC_QUEUE_NAME,
        adapter: BullAdapter, // Usa o adaptador para o Bull
      },
      {
        name: GAME_ENRICHMENT_QUEUE_NAME,
        adapter: BullAdapter, // Usa o adaptador para o Bull
      },
    ),
    SteamModule,
    GamesModule,
    SteamGridDbModule,
  ],
  providers: [SteamSyncProcessor, GameEnrichmentProcessor],
})
export class JobsModule {}
