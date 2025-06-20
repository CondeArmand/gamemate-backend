import { CacheModule } from '@nestjs/cache-manager'; // <-- Importa o CacheModule
import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_URL ?? 'redis://localhost:6379',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      ttl: 60 * 10,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
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
