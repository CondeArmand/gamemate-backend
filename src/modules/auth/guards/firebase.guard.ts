import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject(FirebaseService) private readonly firebaseService: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request); // <-- Usa um método unificado

    if (!token) {
      throw new UnauthorizedException('Token de autenticação não fornecido.');
    }
    try {
      request.user = await this.firebaseService.getAuth().verifyIdToken(token); // Anexa o usuário à requisição
      return true;
    } catch (error) {
      throw new UnauthorizedException(
        'Token inválido ou expirado.' + error.message,
      );
    }
  }

  private extractToken(request: any): string | undefined {
    // 1. Tenta pegar do cabeçalho Authorization (padrão)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
      return authHeader.split(' ')[1];
    }

    // 2. Se não encontrar, tenta pegar do query parameter 'token'
    if (request.query && request.query.token) {
      return request.query.token;
    }

    return undefined;
  }
}
