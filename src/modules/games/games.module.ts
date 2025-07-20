import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GamesService } from './games.service';
import { GamesController } from './games.controller';

@Module({
  imports: [HttpModule],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
