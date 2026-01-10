import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard') // Rota final: /analytics/dashboard
  async getDashboard(
    @Req() req,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    // Se o front não mandar nada, assume mês/ano atuais
    const now = new Date();
    const m = month ? parseInt(month) : now.getMonth() + 1;
    const y = year ? parseInt(year) : now.getFullYear();

    // Passa o ID e a data escolhida para o SEU service
    return this.analyticsService.getDashboardData(req.user.id, m, y);
  }
}