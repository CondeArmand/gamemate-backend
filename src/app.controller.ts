import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { FirebaseAuthGuard } from './auth/firebase.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('profile')
  getProfile(@Request() req): any {
    return {
      message: 'Esta é uma rota protegida!',
      user: req.user,
    };
  }
}
