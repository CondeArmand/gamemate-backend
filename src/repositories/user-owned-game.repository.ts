import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserOwnedGame, Game, Provider } from '@prisma/client';
@Injectable()
export class UserOwnedGameRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria ou atualiza a relação entre um usuário e um jogo,
   * incluindo o tempo de jogo.
   */
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
        // Inclui os dados completos do jogo relacionado em cada resultado
        game: true,
      },
      orderBy: {
        // Opcional: ordena os jogos por tempo de jogo, por exemplo
        playtimeMinutes: 'desc',
      },
    });
  }
}
