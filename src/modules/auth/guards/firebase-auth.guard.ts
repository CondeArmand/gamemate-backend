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
    @Inject(FirebaseService)
    protected readonly firebaseService: FirebaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

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

  protected extractToken(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
      return authHeader.split(' ')[1];
    }

    if (request.query && request.query.token) {
      return request.query.token;
    }

    return undefined;
  }
}
