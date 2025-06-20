import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from 'src/modules/auth/guards/firebase.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../auth/decorators/current-user.decorator';
import { Provider } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    const userId = user.uid;
    return this.usersService.getUserProfile(userId);
  }

  @Get('me/games') // O endpoint será GET /users/me/games
  @UseGuards(FirebaseAuthGuard) // Protege a rota
  getOwnedGames(@CurrentUser() user: AuthenticatedUser) {
    const userId = user.uid;
    return this.usersService.findUserOwnedGames(userId);
  }

  @Delete('me/linked-accounts/:provider') // Ex: DELETE /users/me/linked-accounts/STEAM
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(204) // Retorna "204 No Content" em caso de sucesso, um padrão para DELETE
  async unlinkAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('provider') provider: Provider, // Valida se o provider é um do nosso Enum
  ) {
    const userId = user.uid;
    await this.usersService.unlinkStoreAccount(userId, provider);
    // Não precisa retornar nada no corpo da resposta
  }
}
