import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-steam';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SteamStrategy extends PassportStrategy(Strategy, 'steam') {
  private readonly logger = new Logger(SteamStrategy.name);
  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.get<string>('STEAM_API_KEY');
    const apiUrl = configService.get<string>('API_URL');

    if (!apiKey || !apiUrl) {
      throw new InternalServerErrorException(/*...*/);
    }
    super({
      returnURL: `${apiUrl}/auth/steam/callback`,
      realm: apiUrl,
      apiKey: apiKey,
    });
  }
  validate(identifier: string, profile: any): any {
    return profile;
  }
}
