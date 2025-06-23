import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
// Note que não precisamos mais importar o RepositoriesModule aqui,
// pois o tornamos @Global no passo anterior.
// O NestJS já saberá como injetar o UserRepository.

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  // O UserRepository já está disponível globalmente através do RepositoriesModule
})
export class UsersModule {}
