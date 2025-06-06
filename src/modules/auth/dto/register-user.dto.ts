import { IsString, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  idToken: string; // O ID Token do Firebase

  @IsString()
  @IsOptional() // Torna opcional, caso o displayName já venha no token do Firebase
  @MinLength(3)
  username?: string; // Nome de usuário/apelido
}
