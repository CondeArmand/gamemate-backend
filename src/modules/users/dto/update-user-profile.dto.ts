import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserProfileDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;
}
