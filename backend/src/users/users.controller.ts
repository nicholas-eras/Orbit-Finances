import { Controller, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateBalanceDto } from './dto/update-balance.dto'; // Importe o DTO

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Patch('balance')
  // Use o DTO aqui no @Body()
  async updateBalance(@Req() req, @Body() dto: UpdateBalanceDto) {
    const userId = req.user.id;

    // Use dto.balance
    // O Number() aqui garante, mas o DTO já deve tratar se usar transform: true
    const newBalance = Number(dto.balance); 

    console.log('Recebido:', newBalance); // Debug para ver se chega

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        lastBankBalance: newBalance,
        lastBankBalanceDate: new Date(),
      },
    });
  }
}