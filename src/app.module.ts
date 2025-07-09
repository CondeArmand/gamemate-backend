import { CacheModule } from '@nestjs/cache-manager';
import { Module, Global } from '@nestjs/common';
import { redisStore } from 'cache-manager-redis-store';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { GamesModule } from './modules/games/games.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RepositoriesModule } from './repositories/repositories.module';
import { UsersModule } from './modules/users/users.module';
import { BullModule } from '@nestjs/bull';
import { JobsModule } from './modules/jobs/jobs.module';
import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { SteamGridDbModule } from './modules/steamgriddb/steamgriddb.module';
import { RedisModule } from './redis/redis.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'], // Carrega variáveis de ambiente de arquivos .env e .env.local
    }),
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      ttl: 60 * 10,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: configService.get<string>('REDIS_URL'),
      }),
      inject: [ConfigService],
    }),
    BullBoardModule.forRoot({
      route: '/admin/queues', // O painel ficará acessível em http://localhost:3000/admin/queues
      adapter: ExpressAdapter, // Define o adaptador do servidor web
    }),
    RedisModule,
    JobsModule,
    SteamGridDbModule,
    FirebaseModule,
    PrismaModule,
    RepositoriesModule,
    AuthModule,
    GamesModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
