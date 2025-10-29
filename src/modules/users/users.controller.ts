import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { GameStatus, Provider } from '@prisma/client';
import { AddGameDto } from './dto/add-game.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { GetOwnedGamesDto } from './dto/get-owned-games.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // --- Rotas do Perfil do Usuário (/me) ---

  @Post('me/avatar')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(user.uid, file);
  }

  @Get('me/stats')
  @UseGuards(FirebaseAuthGuard)
  getStates(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getUserStats(user.uid);
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    const userId = user.uid;
    return this.usersService.getUserProfile(userId);
  }

  @Patch('me')
  @UseGuards(FirebaseAuthGuard)
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateUserProfileDto: UpdateUserProfileDto,
  ) {
    const userId = user.uid;
    return this.usersService.updateUserProfile(userId, updateUserProfileDto);
  }

  @Delete('me')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(204)
  async deleteProfile(@CurrentUser() user: AuthenticatedUser) {
    await this.usersService.deleteUserProfile(user.uid);
  }

  // --- Rotas da Biblioteca de Jogos do Usuário (/me/games) ---

  @Get('me/games')
  @UseGuards(FirebaseAuthGuard)
  getOwnedGames(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GetOwnedGamesDto,
  ) {
    return this.usersService.findUserOwnedGames(user.uid, query);
  }

  @Post('me/games')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(201)
  addGame(
    @CurrentUser() user: AuthenticatedUser,
    @Body() addGameDto: AddGameDto,
  ) {
    return this.usersService.addGameToLibrary(user.uid, addGameDto);
  }

  @Put('me/games/:gameId/status')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(204)
  async updateGameStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('gameId') gameId: string,
    @Body('status') status: GameStatus,
  ) {
    const userId = user.uid;
    await this.usersService.updateUserGameStatus(userId, gameId, status);
  }

  @Delete('me/games')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(204)
  async removeGame(
    @CurrentUser() user: AuthenticatedUser,
    @Body('gameId') gameId: string,
  ) {
    const userId = user.uid;
    await this.usersService.removeGameFromLibrary(userId, gameId);
  }

  // --- Rotas de Contas Vinculadas (/me/linked-accounts) ---

  @Post('me/linked-accounts/steam/sync')
  @UseGuards(FirebaseAuthGuard)
  @HttpCode(202)
  async resyncSteamAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.resyncSteamGames(user.uid);
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
