import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
  Req,
  Logger,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { FirebaseAuthGuard } from './guards/firebase.guard';
import { AuthGuard } from '@nestjs/passport';
import {
  AuthenticatedUser,
  CurrentUser,
} from './decorators/current-user.decorator';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Request, Response } from 'express';

// Adicione este tipo para o perfil da Steam para maior clareza
interface SteamProfile {
  id: string;
  displayName: string;
  // ... outros campos que o passport-steam retorna
}

declare module 'express-session' {
  interface SessionData {
    firebaseUid: string;
  }
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly authService: AuthService,
    @InjectQueue('game-sync') private readonly gameSyncQueue: Queue,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.registerUser(registerUserDto);
  }

  @Get('steam')
  @UseGuards(FirebaseAuthGuard)
  steamAuthInitiate(
    @Req() req: Request,
    @Res() res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const gamemateUserId = user.uid;
    this.logger.log(
      `Iniciando fluxo da Steam para o usuário: ${gamemateUserId}`,
    );

    // Armazena o UID na sessão
    req.session.firebaseUid = gamemateUserId;

    // Salva a sessão explicitamente e, no callback, redireciona para o próximo passo
    req.session.save((err) => {
      if (err) {
        this.logger.error(
          'Falha ao salvar a sessão antes de redirecionar para a Steam',
          err,
        );
        return res.redirect(
          `${process.env.FRONTEND_URL}/auth-error?error=session_save`,
        );
      }
      // Redireciona para o nosso próprio endpoint de redirect da Steam
      return res.redirect('/auth/steam/redirect');
    });
  }

  /**
   * PASSO 2: O passo 1 redireciona para cá.
   * Este endpoint apenas ativa o AuthGuard da Steam para redirecionar para a Steam.
   */
  @Get('steam/redirect')
  @UseGuards(AuthGuard('steam'))
  steamAuthRedirect() {}

  /**
   * PASSO 3: A Steam redireciona para cá após a autorização do usuário.
   */
  @Get('steam/callback')
  @UseGuards(AuthGuard('steam'))
  async steamAuthCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log('Recebendo callback da Steam...');
    const steamProfile = req.user as SteamProfile;
    const gamemateUserId = req.session.firebaseUid; // <-- Agora deve funcionar!

    if (!gamemateUserId) {
      this.logger.error(
        'NÃO FOI POSSÍVEL ENCONTRAR O firebaseUid NA SESSÃO DURANTE O CALLBACK DA STEAM.',
      );
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth-error?error=session_missing`,
      );
    }

    this.logger.log(
      `Callback da Steam recebido para o usuário GameMate ${gamemateUserId} e perfil Steam ${steamProfile.id}`,
    );

    // Lógica para salvar o LinkedAccount e disparar o job (inalterada)
    await this.authService.linkSteamAccount(
      gamemateUserId,
      steamProfile.id,
      steamProfile.displayName,
    );

    await this.gameSyncQueue.add('sync-steam-games', {
      userId: gamemateUserId,
      steamId: steamProfile.id,
    });

    // Redireciona o usuário de volta para a página de perfil no frontend
    return res.redirect(`${process.env.FRONTEND_URL}/profile`);
  }
}
