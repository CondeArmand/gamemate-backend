import { CacheModule } from '@nestjs/cache-manager'; // <-- Importa o CacheModule
import { Module } from '@nestjs/common';
import { redisStore } from 'cache-manager-redis-store';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthModule } from './modules/auth/auth.module';
import { GamesModule } from './modules/games/games.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      ttl: 60 * 10,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FirebaseModule,
    PrismaModule,
    AuthModule,
    GamesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
