import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { SteamStrategy } from './strategies/steam.strategy';

@Module({
  imports: [PassportModule, ConfigModule],
  providers: [SteamStrategy],
  exports: [SteamStrategy, PassportModule],
})
export class SteamAuthModule {}
