import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../../prisma/prisma.module'; // Ou o caminho correto
import { FirebaseModule } from '../../firebase/firebase.module'; // Ou o caminho correto
import { FirebaseTokenValidator } from './validators/firebase-token.validator';
import { FirebaseRollbackHelper } from './helpers/firebase-rollback.helper';
import { PassportModule } from '@nestjs/passport';
import { SteamAuthGuard } from './guards/steam-auth.guard';
import { JobsModule } from '../jobs/jobs.module';
import { SteamAuthModule } from './steam.module';

@Module({
  imports: [
    SteamAuthModule,
    PrismaModule,
    FirebaseModule,
    JobsModule,
    PassportModule.register({ session: true }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SteamAuthGuard,
    FirebaseTokenValidator,
    FirebaseRollbackHelper,
  ],
})
export class AuthModule {}
