import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // <-- Importa o HttpModule
import { GamesService } from './games.service';
import { GamesController } from './games.controller';

@Module({
  imports: [
    HttpModule, // <-- Adiciona o HttpModule para fazer chamadas HTTP
  ],
  controllers: [GamesController],
  providers: [GamesService],
})
export class GamesModule {}
