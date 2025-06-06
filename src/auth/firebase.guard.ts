import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { Request } from 'express';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject(FirebaseService) private readonly firebaseService: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticação não fornecido.');
    }

    try {
      const decodedToken = await this.firebaseService
        .getAuth()
        .verifyIdToken(token);

      // Anexa o usuário decodificado (ou apenas o UID/email) à requisição
      // para que possamos usá-lo nos nossos Controllers/Services.
      (request as any).user = decodedToken; // Use 'any' ou crie uma interface estendida

      return true; // Permite o acesso
    } catch (error) {
      console.error('Erro ao verificar o token Firebase:', error.message);
      throw new UnauthorizedException('Token inválido ou expirado.');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
