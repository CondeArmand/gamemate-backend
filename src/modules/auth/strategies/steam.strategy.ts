import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-steam';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SteamStrategy extends PassportStrategy(Strategy, 'steam') {
  // 'steam' é o nome da nossa estratégia

  constructor(private readonly configService: ConfigService) {
    // 1. Pega todas as variáveis de ambiente necessárias primeiro
    const apiKey = configService.get<string>('STEAM_API_KEY');
    const apiUrl = configService.get<string>('API_URL');
    const returnURL = `${apiUrl}/auth/steam/callback`;

    // 2. Verifica se alguma delas está faltando
    if (!apiKey || !apiUrl) {
      // Lança um erro claro que irá parar a inicialização da aplicação
      throw new InternalServerErrorException(
        'Variáveis de ambiente STEAM_API_KEY ou API_URL não estão definidas.',
      );
    }

    // 3. Se tudo existir, chama o super() com os valores garantidos
    super({
      returnURL: returnURL,
      realm: apiUrl,
      apiKey: apiKey,
    });
  }

  // O Passport irá chamar este método após a validação bem-sucedida na Steam
  validate(
    identifier: string,
    profile: any,
    done: (err: any, user: any) => void,
  ) {
    // 'profile' contém os dados do usuário da Steam
    // Nós apenas passamos o perfil adiante para o nosso controller lidar com ele.
    profile.identifier = identifier;
    return done(null, profile);
  }
}
