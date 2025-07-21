import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from 'src/repositories/user.repository';
import { UserOwnedGameRepository } from '../../repositories/user-owned-game.repository';
import { GameStatus, Provider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GameRepository } from '../../repositories/game.repository';
import { AddGameDto } from './dto/add-game.dto';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { FirebaseRollbackHelper } from '../auth/helpers/firebase-rollback.helper';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { GetOwnedGamesDto } from './dto/get-owned-games.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userOwnedGameRepository: UserOwnedGameRepository,
    private readonly gameRepository: GameRepository,
    private readonly prisma: PrismaService,
    private readonly firebaseRollbackHelper: FirebaseRollbackHelper,
    @InjectQueue('game-sync') private readonly gameSyncQueue: Queue,
  ) {}

  async getUserProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    const { totalGames, totalPlaytimeMinutes, ...userProfile } = user;

    console.log(user);

    const profileStats = {
      totalGames: totalGames,
      totalHoursPlayed: parseFloat((totalPlaytimeMinutes / 60).toFixed(1)),
    };

    return {
      ...userProfile,
      profileStats,
    };
  }

  async updateUserProfile(userId: string, data: UpdateUserProfileDto) {
    return this.userRepository.update(userId, data);
  }

  async deleteUserProfile(userId: string) {
    await this.firebaseRollbackHelper.rollbackFirebaseUser(userId);

    const deletedUser = await this.userRepository.delete(userId);

    if (!deletedUser) {
      throw new NotFoundException(`Usuário com ID "${userId}" não encontrado.`);
    }

    return { message: `Usuário com ID "${userId}" deletado com sucesso.` };
  }

  async findUserOwnedGames(userId: string, query: GetOwnedGamesDto) {
    const { skip = 0, take = 20 } = query;
    const queryWithDefaults = { ...query, skip, take };

    const { total, games: ownedGamesRelations } =
      await this.userOwnedGameRepository.findAndCountGamesByUserId(
        userId,
        queryWithDefaults,
      );

    const formattedSkip = parseInt(skip.toString(), 10);
    const formattedTake = parseInt(take.toString(), 10);

    const games = ownedGamesRelations.map((relation) => ({
      ...relation.game,
      playtimeMinutes: relation.playtimeMinutes,
      status: relation.status,
      sourceProvider: relation.sourceProvider,
    }));

    return {
      data: games,
      total,
      hasNextPage: formattedSkip + formattedTake < total,
    };
  }

  async unlinkStoreAccount(userId: string, provider: Provider) {
    return this.prisma.$transaction(async (tx) => {
      // Passo A: Encontrar o ID da conta vinculada para ter certeza de que ela existe
      const linkedAccount = await tx.linkedAccount.findUnique({
        where: { userId_provider: { userId, provider } },
        select: { id: true }, // Seleciona apenas o ID
      });

      if (!linkedAccount) {
        throw new NotFoundException(
          `Nenhuma conta da loja "${provider}" encontrada para este usuário.`,
        );
      }

      await tx.userOwnedGame.deleteMany({
        where: { userId: userId, sourceProvider: provider },
      });

      await tx.linkedAccount.delete({
        where: { userId_provider: { userId, provider } },
      });
    });
  }

  async addGameToLibrary(userId: string, addGameDto: AddGameDto) {
    const { gameId, sourceProvider } = addGameDto;
    await this.gameRepository.findById(gameId);

    const existingOwnership =
      await this.userOwnedGameRepository.findByUserIdAndGameId(userId, gameId);

    if (existingOwnership) {
      throw new ConflictException('Este jogo já está na sua biblioteca.');
    }

    return this.prisma.$transaction([
      this.prisma.userOwnedGame.create({
        data: {
          userId,
          gameId,
          playtimeMinutes: 0,
          sourceProvider: sourceProvider,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          totalGames: {
            increment: 1,
          },
        },
      }),
    ]);
  }

  async removeGameFromLibrary(userId: string, gameId: string) {
    const existingOwnership =
      await this.userOwnedGameRepository.findByUserIdAndGameId(userId, gameId);

    if (!existingOwnership) {
      throw new NotFoundException('Este jogo não está na sua biblioteca.');
    }

    return this.prisma.$transaction([
      this.prisma.userOwnedGame.delete({
        where: { userId_gameId: { userId, gameId } },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          totalGames: {
            decrement: 1,
          },
        },
      }),
    ]);
  }

  async updateUserGameStatus(
    userId: string,
    gameId: string,
    status: GameStatus,
  ) {
    const existingOwnership =
      await this.userOwnedGameRepository.findByUserIdAndGameId(userId, gameId);

    if (!existingOwnership) {
      throw new NotFoundException('Este jogo não está na sua biblioteca.');
    }

    return this.userOwnedGameRepository.updateStatus(userId, gameId, status);
  }

  async resyncSteamGames(userId: string) {
    const linkedAccount = await this.prisma.linkedAccount.findUnique({
      where: { userId_provider: { userId, provider: Provider.STEAM } },
    });

    if (!linkedAccount) {
      throw new NotFoundException('Conta Steam não vinculada.');
    }

    await this.gameSyncQueue.add('sync-steam-games', {
      userId: userId,
      steamId: linkedAccount.providerAccountId,
    });
  }
}
