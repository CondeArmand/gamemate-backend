import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // Conecta ao banco de dados quando o módulo é inicializado
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.$connect();
    console.log('Prisma Client conectado ao banco de dados.');
  }

  async onModuleDestroy() {
    // Desconecta do banco de dados quando a aplicação é encerrada
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.$disconnect();
    console.log('Prisma Client desconectado.');
  }

  // Opcional: Limpeza para testes E2E ou cenários específicos
  // async cleanDatabase() {
  //   // Implemente a lógica para limpar tabelas se necessário
  //   // Cuidado: Isso apagará dados!
  // }
}
