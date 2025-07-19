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

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userOwnedGameRepository: UserOwnedGameRepository,
    private readonly gameRepository: GameRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getUserProfile(userId: string) {
    const user = await this.userRepository.findById(userId);
    const { totalGames, totalPlaytimeMinutes, ...userProfile } = user;

    const profileStats = {
      totalGames: totalGames,
      totalHoursPlayed: parseFloat((totalPlaytimeMinutes / 60).toFixed(1)),
    };

    return {
      ...userProfile,
      profileStats,
    };
  }

  async findUserOwnedGames(userId: string) {
    const ownedGamesRelations =
      await this.userOwnedGameRepository.findGamesByUserId(userId);

    return ownedGamesRelations.map((relation) => ({
      ...relation.game, // Pega todos os dados do jogo (id, name, coverUrl, etc.)
      playtimeMinutes: relation.playtimeMinutes, // Adiciona o tempo de jogo
    }));
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

      // Passo B: Deletar todos os registros de jogos possuídos vindos desta conta/loja
      // (Esta parte precisaria de mais lógica se um jogo pudesse ser possuído em múltiplas lojas.
      // Por agora, vamos assumir que deletamos a ligação user-game).
      await tx.userOwnedGame.deleteMany({
        where: { userId: userId, sourceProvider: provider }, // Simplificação: deleta todos os jogos do usuário.
        // Uma lógica mais avançada poderia ter um 'sourceProvider' na tabela UserOwnedGame.
      });

      // Passo C: Deletar a conta vinculada em si
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
}
