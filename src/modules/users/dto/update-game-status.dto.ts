import { IsEnum } from 'class-validator';
import { GameStatus } from '@prisma/client';

export class UpdateGameStatusDto {
  @IsEnum(GameStatus)
  status: GameStatus;
}
