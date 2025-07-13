import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from 'src/modules/auth/guards/firebase-auth.guard';
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

  @Get('me/games')
  @UseGuards(FirebaseAuthGuard)
  getOwnedGames(@CurrentUser() user: AuthenticatedUser) {
    const userId = user.uid;
    return this.usersService.findUserOwnedGames(userId);
  }

  @Delete('me/linked-accounts/:provider')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(204)
  async unlinkAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('provider') provider: Provider,
  ) {
    const userId = user.uid;
    await this.usersService.unlinkStoreAccount(userId, provider);
  }
}
