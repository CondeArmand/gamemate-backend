import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SteamGridDbService } from './steamgriddb.service';

@Module({
  imports: [HttpModule], // Precisa do HttpModule para fazer chamadas de API
  providers: [SteamGridDbService],
  exports: [SteamGridDbService], // Exporta o serviço para outros módulos usarem
})
export class SteamGridDbModule {}
