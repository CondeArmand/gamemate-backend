import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard'; // Importamos nosso guarda existente

@Injectable()
export class OptionalFirebaseAuthGuard
  extends FirebaseAuthGuard
  implements CanActivate
{
  // Sobrescrevemos o método principal
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request); // Usamos o mesmo extrator de token

    // Se NÃO houver token, permite que a requisição continue sem um usuário anexado.
    if (!token) {
      return true;
    }

    // Se HOUVER um token, executa a lógica de validação normal do guarda pai.
    try {
      // a lógica do canActivate do FirebaseAuthGuard original
      const decodedToken = await this.firebaseService
        .getAuth()
        .verifyIdToken(token);
      request.user = decodedToken; // Anexa o usuário se o token for válido
    } catch (error) {
      // Se o token existir mas for inválido, não lançamos um erro,
      // apenas continuamos sem um usuário autenticado.
      // Poderíamos também lançar um 401 aqui se quisermos ser mais estritos.
    }

    return true; // Sempre permite que a rota seja acessada.
  }
}
