import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SteamService } from './steam.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000, // Timeout de 5 segundos para as requisições
      maxRedirects: 5,
    }),
  ],
  providers: [SteamService],
  exports: [SteamService], // Exporta o serviço para que o nosso worker possa usá-lo
})
export class SteamModule {}
