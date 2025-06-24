import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class SteamAuthGuard extends AuthGuard('steam') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    // Pega o 'state' da URL e o passa como opção para a estratégia do Passport.
    return { state: req.query.state };
  }
}
