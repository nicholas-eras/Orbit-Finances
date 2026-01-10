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
  async googleAuth(@Req() req) {}

@Get('google/callback')
@UseGuards(AuthGuard('google'))
async googleAuthRedirect(@Req() req, @Res() res) {
  const user = await this.authService.validateGoogleUser(req.user);
  
  const jwtResult = await this.authService.login(user);

  const frontendUrl = this.configService.getOrThrow('FRONTEND_URL');
  const redirectUrl = `${frontendUrl}/login/callback?token=${jwtResult.access_token}`;
  
  console.log('🔍 Frontend URL:', frontendUrl);
  console.log('🔍 Redirect URL completa:', redirectUrl);
  console.log('🔍 Token:', jwtResult.access_token);
  
  return res.redirect(redirectUrl);
}
}