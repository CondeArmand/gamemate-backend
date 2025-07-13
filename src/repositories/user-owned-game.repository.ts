import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserOwnedGame, Game, Provider } from '@prisma/client';
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

  async findGamesByUserId(
    userId: string,
  ): Promise<(UserOwnedGame & { game: Game })[]> {
    return this.prisma.userOwnedGame.findMany({
      where: { userId },
      include: {
        game: true,
      },
      orderBy: {
        playtimeMinutes: 'desc',
      },
    });
  }

  async findByUserIdAndGameId(
    userId: string,
    gameId: string,
  ): Promise<UserOwnedGame | null> {
    return this.prisma.userOwnedGame.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });
  }
}
