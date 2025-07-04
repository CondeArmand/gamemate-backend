import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { FirebaseTokenValidator } from './validators/firebase-token.validator';
import { FirebaseRollbackHelper } from './helpers/firebase-rollback.helper';
import { UserRepository } from 'src/repositories/user.repository';
import { LinkedAccountRepository } from '../../repositories/linked-account.repository';
import { Provider } from '@prisma/client';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenValidator: FirebaseTokenValidator,
    private readonly linkedAccountRepository: LinkedAccountRepository,
    private readonly rollbackHelper: FirebaseRollbackHelper,
  ) {}

  async registerUser(registerUserDto: RegisterUserDto) {
    const { idToken, username: usernameFromDto } = registerUserDto;

    const decodedToken = await this.tokenValidator.validate(idToken);
    const { uid, email, name: nameFromToken } = decodedToken;

    if (!email) {
      this.logger.error(
        `Token do Firebase (UID: ${uid}) não contém um email. Iniciando rollback.`,
      );

      await this.rollbackHelper.rollbackFirebaseUser(uid);
      throw new BadRequestException(
        'O token do Firebase não forneceu um email. Cadastro cancelado.',
      );
    }

    const finalUsername =
      usernameFromDto || nameFromToken || email.split('@')[0];

    try {
      const newUser = await this.userRepository.create({
        id: uid,
        email,
        name: finalUsername,
      });

      this.logger.log(`Usuário UID ${uid} registrado com sucesso no sistema.`);
      const { ...userProfile } = newUser;
      return {
        message: 'Usuário registrado com sucesso!',
        user: userProfile,
      };
    } catch (error) {
      this.logger.error(
        `Falha na camada de repositório. Orquestrando rollback para UID: ${uid}.`,
        error.stack,
      );

      if (error instanceof ConflictException) {
        throw error;
      }

      await this.rollbackHelper.rollbackFirebaseUser(uid);
      throw new InternalServerErrorException(
        'Ocorreu um erro ao registrar o usuário.',
      );
    }
  }

  async linkSteamAccount(
    userId: string,
    steamId: string,
    steamUsername: string,
  ) {
    this.logger.log(
      `Vinculando conta Steam (ID: ${steamId}) ao usuário GameMate (ID: ${userId})`,
    );

    // Usa o repositório para criar ou atualizar o registro
    return this.linkedAccountRepository.upsert({
      userId: userId,
      provider: Provider.STEAM, // Usa o valor do Enum do Prisma
      providerAccountId: steamId,
      username: steamUsername,
    });
  }
}
