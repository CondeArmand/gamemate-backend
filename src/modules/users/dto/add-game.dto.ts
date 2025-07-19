import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Provider } from '@prisma/client';

export class AddGameDto {
  @IsString()
  @IsNotEmpty()
  gameId: string;

  @IsEnum(Provider)
  @IsNotEmpty()
  sourceProvider: Provider;
}
