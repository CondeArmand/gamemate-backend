import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';
import passport from 'passport';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'default,secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 1 dia
        httpOnly: true, // Protege contra XSS
        secure: process.env.NODE_ENV === 'production', // Usa cookies seguros em produção
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
