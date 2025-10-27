import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { GameStatus, Provider } from '@prisma/client';

export class GetOwnedGamesDto {
  // Filtros
  @IsEnum(GameStatus)
  @IsOptional()
  status?: GameStatus;

  @IsEnum(Provider)
  @IsOptional()
  provider?: Provider;

  @IsString()
  @IsOptional()
  name?: string;

  // Paginação
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  skip?: number = 0;

  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  take?: number = 20;
}
