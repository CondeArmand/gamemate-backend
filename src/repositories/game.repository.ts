import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class GameRepository {
  private readonly logger = new Logger(GameRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um novo jogo se ele não existir, ou atualiza se já existir.
   * Usa o steamAppId como chave única para a operação.
   * @param gameData Dados do jogo para criar ou atualizar.
   */
  async smartUpsert(gameData: Prisma.GameCreateInput) {
    // Só podemos fazer a busca se tivermos pelo menos um ID único
    if (!gameData.steamAppId && !gameData.igdbId) {
      this.logger.warn(
        'smartUpsert chamado sem steamAppId ou igdbId. Criando novo jogo.',
        gameData.name,
      );
      return this.prisma.game.create({ data: gameData });
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
      // Jogo encontrado, vamos ATUALIZAR
      this.logger.debug(
        `Jogo existente encontrado (ID: ${existingGame.id}). Atualizando.`,
      );
      return this.prisma.game.update({
        where: { id: existingGame.id },
        data: gameData, // Atualiza com todos os novos dados
      });
    } else {
      // Jogo não encontrado, vamos CRIAR
      this.logger.debug(
        `Nenhum jogo existente encontrado. Criando novo para: ${gameData.name}`,
      );
      return this.prisma.game.create({
        data: gameData,
      });
    }
  }
}
