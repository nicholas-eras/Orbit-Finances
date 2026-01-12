import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {
    // Apenas redireciona para o Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req, @Res() res) {
    const user = await this.authService.validateGoogleUser(req.user);
    const jwtResult = await this.authService.login(user);

    const frontendUrl = this.configService.getOrThrow('FRONTEND_URL');

    res.cookie('orbit_token', jwtResult.access_token, {
      httpOnly: true, // não acessível via JS
      secure: this.configService.get('NODE_ENV') === 'production', // HTTPS apenas em produção
      sameSite: 'strict', // proteção máxima contra CSRF
      path: '/',
      maxAge: 1000 * 60 * 60 * 24, // 1 dia
    });

    return res.redirect(`${frontendUrl}/dashboard`);
  }

  @Get('logout')
  async logout(@Res() res) {
    const frontendUrl = this.configService.getOrThrow('FRONTEND_URL');

    res.clearCookie('orbit_token', { path: '/' });
    return res.redirect(`${frontendUrl}/login`);
  }
}
