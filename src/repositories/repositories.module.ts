import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserRepository } from './user.repository';
import { GameRepository } from './game.repository';
import { UserOwnedGameRepository } from './user-owned-game.repository';
import { LinkedAccountRepository } from './linked-account.repository';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    UserRepository,
    GameRepository,
    UserOwnedGameRepository,
    LinkedAccountRepository,
  ],
  exports: [
    UserRepository,
    GameRepository,
    UserOwnedGameRepository,
    LinkedAccountRepository,
  ],
})
export class RepositoriesModule {}
