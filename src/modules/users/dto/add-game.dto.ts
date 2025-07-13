import { IsNotEmpty, IsString } from 'class-validator';

export class AddGameDto {
  @IsString()
  @IsNotEmpty()
  gameId: string;
}
