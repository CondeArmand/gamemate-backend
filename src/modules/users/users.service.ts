import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from 'src/repositories/user.repository';
import { UserOwnedGameRepository } from '../../repositories/user-owned-game.repository';
import { Provider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userOwnedGameRepository: UserOwnedGameRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getUserProfile(userId: string) {
    return await this.userRepository.findById(userId);
  }

  async findUserOwnedGames(userId: string) {
    const ownedGamesRelations =
      await this.userOwnedGameRepository.findGamesByUserId(userId);

    const games = ownedGamesRelations.map((relation) => ({
      ...relation.game, // Pega todos os dados do jogo (id, name, coverUrl, etc.)
      playtimeMinutes: relation.playtimeMinutes, // Adiciona o tempo de jogo
    }));

    return games;
  }

  async unlinkStoreAccount(userId: string, provider: Provider) {
    // Usamos uma transação para garantir que ambas as operações (deletar jogos e deletar conta)
    // sejam bem-sucedidas, ou nenhuma delas é executada.
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
}
