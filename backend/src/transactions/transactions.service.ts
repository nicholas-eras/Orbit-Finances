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
        // BACKEND "BURRO":
        // Apenas transforma a string do Front em Objeto Date pro Prisma.
        // Se o front mandou "2026-01-07T00:00:00Z", salva isso.
        // Se o front mandou "2026-01-07T03:00:00Z", salva isso.
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

  async findAll(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' }, // Ordena pelo que foi salvo
      take: 20,
      include: { category: true }
    });
  }
}