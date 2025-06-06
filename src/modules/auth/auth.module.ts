import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../../prisma/prisma.module'; // Ou o caminho correto
import { FirebaseModule } from '../../firebase/firebase.module'; // Ou o caminho correto
import { UserRepository } from './repositories/user.repository';
import { FirebaseTokenValidator } from './validators/firebase-token.validator';
import { FirebaseRollbackHelper } from './helpers/firebase-rollback.helper';

@Module({
  imports: [PrismaModule, FirebaseModule], // Importa os módulos necessários
  controllers: [AuthController],
  providers: [
    AuthService,
    UserRepository,
    FirebaseTokenValidator,
    FirebaseRollbackHelper,
  ],
})
export class AuthModule {}
