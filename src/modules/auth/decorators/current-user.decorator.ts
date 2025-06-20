import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';

/**
 * O tipo do usuário que nosso FirebaseAuthGuard anexa à requisição.
 * Este é o mesmo tipo do decodedToken do Firebase.
 */
export type AuthenticatedUser = DecodedIdToken;

/**
 * Decorator @CurrentUser
 * Extrai o objeto 'user' que foi anexado à requisição pelo FirebaseAuthGuard.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    // Assumimos que o FirebaseAuthGuard já validou o token
    // e anexou o objeto decodificado 'user' à requisição.
    return request.user;
  },
);
