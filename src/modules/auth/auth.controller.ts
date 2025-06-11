import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerUserDto: RegisterUserDto,
    @Headers('Authorization') authHeader: string,
  ) {
    // LOG PARA DEPURAÇÃO
    console.log('============================================');
    console.log('HEADERS RECEBIDOS DO CLIENTE:');
    console.log('Raw Authorization Header:', authHeader);
    console.log('DTO Body (idToken dentro dele):', registerUserDto.idToken);
    console.log('============================================');

    return this.authService.registerUser(registerUserDto);
  }
}
