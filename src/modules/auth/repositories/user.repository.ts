import {
  Injectable,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service'; // Ajuste o caminho
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria um novo usuário no banco de dados.
   * Lida com erros específicos do Prisma.
   * @param data - Dados do usuário a serem criados.
   * @returns O usuário criado.
   * @throws ConflictException se o usuário já existir (unique constraint).
   * @throws InternalServerErrorException para outros erros de banco de dados.
   */
  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await this.prisma.user.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Erro P2002: Violação de constraint única (ex: email ou id já existem)
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Usuário com este email ou ID já existe.',
          );
        }
      }
      // Para todos os outros erros do Prisma ou erros inesperados
      throw new InternalServerErrorException(
        'Erro ao criar usuário no banco de dados.',
      );
    }
  }

  // No futuro, outros métodos como findById, findByEmail, etc., viveriam aqui.
  // async findByEmail(email: string): Promise<User | null> { ... }
}
