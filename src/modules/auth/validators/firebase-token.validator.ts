import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';
import { DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class FirebaseTokenValidator {
  private readonly logger = new Logger(FirebaseTokenValidator.name);

  constructor(private readonly firebaseAdmin: FirebaseService) {}

  /**
   * Valida um ID Token do Firebase.
   * @param idToken O token a ser validado.
   * @returns O token decodificado se for válido e contiver um email.
   * @throws BadRequestException se o token for inválido ou não contiver email.
   */
  async validate(idToken: string): Promise<DecodedIdToken> {
    try {
      const decodedToken = await this.firebaseAdmin
        .getAuth()
        .verifyIdToken(idToken, true);

      if (!decodedToken.email) {
        // Se a validação do token passar mas ele não tiver email, é um problema.
        // Neste ponto, o usuário já existe no Firebase. A lógica de rollback
        // precisaria ser chamada por quem usa este validador.
        // Por enquanto, apenas lançamos o erro.
        throw new Error('O token do Firebase não contém um email.');
      }

      this.logger.log(
        `Token verificado com sucesso para UID: ${decodedToken.uid}`,
      );
      return decodedToken;
    } catch (error) {
      this.logger.error(
        'Falha na validação do ID Token do Firebase:',
        error.message,
      );
      throw new BadRequestException('Token do Firebase inválido ou expirado.');
    }
  }
}
