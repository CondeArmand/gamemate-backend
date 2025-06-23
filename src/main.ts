import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session'; // Mudei para importação de namespace
import passport from 'passport'; // Mudei para importação de namespace
import { RedisStore } from 'connect-redis'; // 'connect-redis' já é compatível
import { createClient } from 'redis'; // <-- IMPORTANTE: Troque a importação
import * as process from 'node:process';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisClient = createClient({
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  });

  // 2. Conecte o cliente. É um passo necessário na v4.
  await redisClient.connect();

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
