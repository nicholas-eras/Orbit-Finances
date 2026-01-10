import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTransactionDto) {
    let finalAmount = Math.abs(dto.amount);
    if (dto.type === 'EXPENSE') {
      finalAmount = -finalAmount;
    }

    return this.prisma.transaction.create({
      data: {
        amount: finalAmount,
        date: new Date(dto.date), 
        description: dto.description,
        type: dto.type,
        isPaid: dto.isPaid ?? true,
        userId,
        categoryId: dto.categoryId,
      },
      include: { category: true }
    });
  }

  // ATUALIZADO: Aceita mês e ano opcionais
  async findAll(userId: string, month?: number, year?: number) {
    const where: any = { userId };

    // Se o frontend enviou mês e ano, filtramos
    if (month && year) {
      // Cria o intervalo de datas:
      // Data Inicial: Dia 1 do mês, 00:00:00
      const startDate = new Date(year, month - 1, 1);
      
      // Data Final: Dia 1 do PRÓXIMO mês (usaremos 'lt' - less than)
      // Isso evita problemas com 23:59:59.999
      const endDate = new Date(year, month, 1);

      where.date = {
        gte: startDate, // Maior ou igual ao dia 1
        lt: endDate,    // Menor estrito que o dia 1 do próximo mês
      };
    }

    return this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      // Removemos o 'take: 20' quando filtramos por mês 
      // para ver todas as contas daquele mês
      take: month && year ? undefined : 20, 
      include: { category: true }
    });
  }
}