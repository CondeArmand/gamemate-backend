import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LinkedAccount, Prisma, Provider } from '@prisma/client';

@Injectable()
export class LinkedAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma nova conta vinculada se não existir para o usuário/provedor,
   * ou atualiza os dados se já existir.
   * @param data - Dados para a operação de upsert.
   */
  async upsert(data: {
    userId: string;
    provider: Provider;
    providerAccountId: string;
    username: string;
  }): Promise<LinkedAccount> {
    const { userId, provider, providerAccountId, username } = data;

    try {
      return await this.prisma.linkedAccount.upsert({
        where: {
          // Usa o índice único que definimos no schema
          userId_provider: {
            userId,
            provider,
          },
        },
        update: {
          // O que atualizar se a conta já existir
          providerAccountId: providerAccountId,
          username: username,
        },
        create: {
          // O que criar se for a primeira vez
          userId,
          provider,
          providerAccountId,
          username,
        },
      });
    } catch (error) {
      // Lança um erro genérico para outros problemas de banco de dados
      throw new InternalServerErrorException(
        'Erro ao salvar a conta vinculada no banco de dados.' + error.message,
      );
    }
  }

  /**
   * Deleta uma conta vinculada com base no ID do usuário e no provedor.
   */
  async delete(userId: string, provider: Provider): Promise<LinkedAccount> {
    try {
      return await this.prisma.linkedAccount.delete({
        where: {
          // Usa o índice único que definimos no schema
          userId_provider: {
            userId,
            provider,
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Erro P2025: O registo a ser deletado não foi encontrado.
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `Nenhuma conta da loja "${provider}" encontrada para este usuário.`,
          );
        }
      }
      throw new InternalServerErrorException(
        'Erro ao deletar a conta vinculada.',
      );
    }
  }
}
