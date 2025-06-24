import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Game, Prisma } from '@prisma/client';

@Injectable()
export class GameRepository {
  private readonly logger = new Logger(GameRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findBySteamId(steamAppId: string): Promise<Game | null> {
    return this.prisma.game.findUnique({
      where: { steamAppId },
    });
  }

  async smartUpsert(gameData: Prisma.GameCreateInput) {
    if (!gameData.steamAppId && !gameData.igdbId) {
      this.logger.warn(
        'smartUpsert chamado sem steamAppId ou igdbId. Criando novo jogo.',
        gameData.name,
      );
      return this.prisma.game.create({
        data: gameData,
      });
    }

    const whereClauses: Prisma.GameWhereInput[] = [];

    if (gameData.steamAppId) {
      whereClauses.push({ steamAppId: gameData.steamAppId });
    }
    if (gameData.igdbId) {
      whereClauses.push({ igdbId: gameData.igdbId });
    }

    const existingGame = await this.prisma.game.findFirst({
      where: {
        OR: whereClauses,
      },
    });

    if (existingGame) {
      this.logger.debug(
        `Jogo existente encontrado (ID: ${existingGame.id}). Atualizando.`,
      );
      return this.prisma.game.update({
        where: { id: existingGame.id },
        data: gameData,
      });
    } else {
      this.logger.debug(
        `Nenhum jogo existente encontrado. Criando novo para: ${gameData.name}`,
      );
      return this.prisma.game.create({
        data: gameData,
      });
    }
  }
}
