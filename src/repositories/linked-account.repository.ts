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
          userId_provider: {
            userId,
            provider,
          },
        },
        update: {
          providerAccountId: providerAccountId,
          username: username,
        },
        create: {
          userId,
          provider,
          providerAccountId,
          username,
        },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        'Erro ao salvar a conta vinculada no banco de dados.' + error.message,
      );
    }
  }

  async delete(userId: string, provider: Provider): Promise<LinkedAccount> {
    try {
      return await this.prisma.linkedAccount.delete({
        where: {
          userId_provider: {
            userId,
            provider,
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
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
