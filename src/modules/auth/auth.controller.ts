import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { AuthGuard } from '@nestjs/passport';
import { Queue } from 'bull';
import { Request, Response } from 'express';
import {
  CurrentUser,
  AuthenticatedUser,
} from './decorators/current-user.decorator';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';

declare module 'express-session' {
  interface SessionData {
    firebaseUid?: string;
  }
}

interface SteamProfile {
  id: string;
  displayName: string;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

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
  steamLogin(@Req() req: Request, @CurrentUser() user: AuthenticatedUser) {
    req.session.firebaseUid = user.uid;
    this.logger.log(
      `Sessão iniciada para vincular a Steam ao usuário: ${user.uid}`,
    );

    if (req.res) {
      this.logger.log('Redirecionando para o guard da Steam...');
      req.res.redirect('/auth/steam/authenticate');
    }
  }

  @Get('steam/authenticate')
  @UseGuards(AuthGuard('steam'))
  steamAuthRedirect() {
    // Intencionalmente vazio. O AuthGuard cuida do redirecionamento para a Steam.
  }

  @Get('steam/callback')
  @UseGuards(AuthGuard('steam'))
  async steamCallback(@Req() req: Request, @Res() res: Response) {
    this.logger.log('--- CALLBACK DA STEAM RECEBIDO ---');
    const steamProfile = req.user as SteamProfile;

    const gamemateUserId = req.session.firebaseUid;

    if (!gamemateUserId) {
      this.logger.error(
        'CRÍTICO: firebaseUid não encontrado na sessão durante o callback da Steam.',
      );
      return res
        .status(400)
        .send('<h1>Erro: Sessão do usuário não encontrada.</h1>');
    }

    req.session.firebaseUid = undefined;

    this.logger.log(
      `Vinculando conta Steam ${steamProfile.id} ao usuário ${gamemateUserId}`,
    );
    await this.authService.linkSteamAccount(
      gamemateUserId,
      steamProfile.id,
      steamProfile.displayName,
    );

    this.logger.log(
      `Disparando job de sincronização para o usuário ${gamemateUserId}`,
    );
    await this.gameSyncQueue.add('sync-steam-games', {
      userId: gamemateUserId,
      steamId: steamProfile.id,
    });

    res.send(`
      <html lang="pt-br">
        <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
          <h1>Vinculação com a Steam concluída!</h1>
          <p>Você já pode fechar esta janela.</p>
          <script>window.close();</script>
        </body>
      </html>
    `);
  }
}
