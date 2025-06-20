import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../../prisma/prisma.module'; // Ou o caminho correto
import { FirebaseModule } from '../../firebase/firebase.module'; // Ou o caminho correto
import { FirebaseTokenValidator } from './validators/firebase-token.validator';
import { FirebaseRollbackHelper } from './helpers/firebase-rollback.helper';
import { PassportModule } from '@nestjs/passport';
import { SteamStrategy } from './strategies/steam.strategy';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    PrismaModule,
    FirebaseModule,
    BullModule.registerQueue({
      name: 'game-sync',
    }),
    PassportModule.register({ session: true }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SteamStrategy,
    FirebaseTokenValidator,
    FirebaseRollbackHelper,
  ],
})
export class AuthModule {}
