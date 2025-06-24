import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';
import passport from 'passport';
import { RedisStore } from 'connect-redis';
import * as process from 'node:process';
import { RedisClientType } from 'redis';
import { REDIS_CLIENT } from './redis/redis.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisClient = app.get<RedisClientType>(REDIS_CLIENT);

  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'gamemate_session:',
  });

  app.use(
    session({
      store: redisStore,
      secret: process.env.SESSION_SECRET ?? 'default,secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session()); // <-- ADICIONAL: Você precisa disso para sessões persistentes com Passport

  app.enableCors();
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
