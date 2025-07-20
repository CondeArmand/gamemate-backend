import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from '../../../firebase/firebase.service';

@Injectable()
export class FirebaseRollbackHelper {
  private readonly logger = new Logger(FirebaseRollbackHelper.name);
  constructor(private readonly firebaseAdmin: FirebaseService) {}

  /**
   * Tenta deletar um usuário do Firebase de forma segura (para rollback).
   * @param uid O UID do usuário a ser deletado.
   */
  async rollbackFirebaseUser(uid: string): Promise<void> {
    this.logger.warn(`Iniciando rollback no Firebase para o UID: ${uid}`);
    try {
      await this.firebaseAdmin.getAuth().deleteUser(uid);
      this.logger.log(
        `ROLLBACK: Usuário UID ${uid} deletado do Firebase com sucesso.`,
      );
    } catch (firebaseDeleteError) {
      this.logger.error(
        `CRÍTICO: Falha no rollback do Firebase para UID ${uid}. Este usuário precisa ser investigado.`,
        firebaseDeleteError.stack,
      );
    }
  }
}
