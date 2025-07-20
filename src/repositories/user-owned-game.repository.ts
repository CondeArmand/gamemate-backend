import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Game,
  GameStatus,
  Prisma,
  Provider,
  UserOwnedGame,
} from '@prisma/client';
import { GetOwnedGamesDto } from '../modules/users/dto/get-owned-games.dto';

@Injectable()
export class UserOwnedGameRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    userId: string,
    gameId: string,
    playtimeMinutes: number,
    sourceProvider: Provider,
  ): Promise<UserOwnedGame> {
    return this.prisma.userOwnedGame.upsert({
      where: { userId_gameId: { userId, gameId } },
      update: {
        playtimeMinutes: playtimeMinutes,
      },
      create: {
        userId,
        gameId,
        playtimeMinutes,
        sourceProvider,
      },
    });
  }

  async findAndCountGamesByUserId(
    userId: string,
    options: GetOwnedGamesDto,
  ): Promise<{ total: number; games: (UserOwnedGame & { game: Game })[] }> {
    const { status, provider, name, skip, take } = options;

    const where: Prisma.UserOwnedGameWhereInput = {
      userId,
      ...(status && { status }),
      ...(provider && { sourceProvider: provider }),
      ...(name && {
        game: {
          name: {
            contains: name,
            mode: 'insensitive',
          },
        },
      }),
    };

    const total = await this.prisma.userOwnedGame.count({ where });

    const formattedSkip = skip ? parseInt(skip.toString(), 10) : 0;
    const formattedTake = take ? parseInt(take.toString(), 10) : 20;

    const games = await this.prisma.userOwnedGame.findMany({
      where,
      include: {
        game: true,
      },
      orderBy: {
        game: {
          name: 'asc',
        },
      },
      skip: formattedSkip,
      take: formattedTake,
    });

    return { total, games };
  }

  async findByUserIdAndGameId(
    userId: string,
    gameId: string,
  ): Promise<UserOwnedGame | null> {
    return this.prisma.userOwnedGame.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });
  }

  async updateStatus(
    userId: string,
    gameId: string,
    status: GameStatus,
  ): Promise<UserOwnedGame> {
    try {
      return await this.prisma.userOwnedGame.update({
        where: { userId_gameId: { userId, gameId } },
        data: { status },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          `O usuário não possui o jogo com o ID especificado.`,
        );
      }
      throw error;
    }
  }
}
