import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SteamService } from './steam.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // 30 segundos
      maxRedirects: 5,
    }),
  ],
  providers: [SteamService],
  exports: [SteamService],
})
export class SteamModule {}
