import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class ResolveGameDto {
  @IsString()
  @IsOptional()
  @ValidateIf((obj) => !obj.steamAppId)
  igdbId?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((obj) => !obj.igdbId)
  steamAppId?: string;
}
