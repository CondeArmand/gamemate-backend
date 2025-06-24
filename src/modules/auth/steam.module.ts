// src/modules/auth/steam.module.ts

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config'; // Importe o ConfigModule
import { SteamStrategy } from './strategies/steam.strategy';

@Module({
  imports: [
    PassportModule,
    ConfigModule, // Importar o ConfigModule garante que ele esteja disponível
  ],
  providers: [
    SteamStrategy, // O provedor da estratégia vive aqui
  ],
  exports: [
    SteamStrategy, // Exporte para que os guards possam encontrá-la
    PassportModule,
  ],
})
export class SteamAuthModule {}
