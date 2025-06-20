import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';
import passport from 'passport';
import { RedisStore } from 'connect-redis';
import Redis from 'ioredis';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '123', 10),
  });

  // 4. Inicializa o RedisStore com o cliente
  const redisStore = new RedisStore({
    client: redisClient,
    prefix: 'gamemate_session:', // Um prefixo para organizar as chaves no Redis
  });

  // 5. Usa o RedisStore na configuração da sessão
  app.use(
    session({
      store: redisStore,
      secret: process.env.SESSION_SECRET ?? 'default,secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // Sessão dura 7 dias, por exemplo
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.enableCors();
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
