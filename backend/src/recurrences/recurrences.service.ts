import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateRecurrenceDto } from './dto/create-recurrence.dto';
import { startOfDay, addDays, addMonths, addWeeks, addYears, isBefore, isAfter, isSameDay } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RecurrencesService {
  private readonly logger = new Logger(RecurrencesService.name);

  constructor(private prisma: PrismaService) {}

  // ======================================================
  // 1. CRIAÇÃO (Com include da Categoria)
  // ======================================================
  async create(userId: string, dto: CreateRecurrenceDto) {
    const startDate = startOfDay(new Date(dto.startDate));

    // Cria a regra no banco
    const rule = await this.prisma.recurrenceRule.create({
      data: {
        userId,
        frequency: dto.frequency,
        interval: dto.interval,
        startDate: startDate,
        originalAmount: dto.type === 'EXPENSE' ? -Math.abs(dto.amount) : Math.abs(dto.amount),
        description: dto.description,
        nextRun: startDate,
        categoryId: dto.categoryId,
      },
      // AQUI: Retorna a categoria logo após criar para o front não precisar recarregar
      include: {
        category: true 
      }
    });

    // 1. Faz o Backfill
    const nextFutureDate = await this.processBackfillAndGetNext(rule);

    // 2. Atualiza o nextRun
    await this.prisma.recurrenceRule.update({
      where: { id: rule.id },
      data: { nextRun: nextFutureDate }
    });

    // Retorna a regra (que já tem a category dentro devido ao include acima)
    return rule;
  }

  // ======================================================
  // 2. BUSCAR TODAS (Com include da Categoria)
  // ======================================================
  async findAll(userId: string) {
    return this.prisma.recurrenceRule.findMany({
      where: { userId },
      // AQUI: O segredo para o JSON vir completo
      include: {
        category: true
      },
      orderBy: { startDate: 'asc' }
    });
  }

  // ======================================================
  // REMOVER
  // ======================================================
  async remove(id: string, userId: string) {
    const result = await this.prisma.recurrenceRule.deleteMany({
      where: {
        id: id,
        userId: userId
      }
    });

    if (result.count === 0) {
      throw new NotFoundException('Recorrência não encontrada ou não pertence a este usuário.');
    }

    return { message: 'Recorrência removida com sucesso' };
  }

  // ======================================================
  // CRON JOB
  // ======================================================
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyCron() {    
    const today = startOfDay(new Date());

    const rulesToProcess = await this.prisma.recurrenceRule.findMany({
      where: { 
        endDate: null,
        nextRun: { lte: today } 
      }
    });

    this.logger.log(`Processando ${rulesToProcess.length} recorrências...`);

    for (const rule of rulesToProcess) {
      await this.createTransaction(rule, rule.nextRun);
      const nextDate = this.calculateNextDate(rule.nextRun, rule.frequency, rule.interval);

      await this.prisma.recurrenceRule.update({
        where: { id: rule.id },
        data: { nextRun: nextDate }
      });
    }
  }

  // ======================================================
  // MÉTODOS AUXILIARES
  // ======================================================
  private async processBackfillAndGetNext(rule: any): Promise<Date> {
    let cursor = startOfDay(new Date(rule.startDate));
    const today = startOfDay(new Date());

    while (isBefore(cursor, today) || isSameDay(cursor, today)) {
      await this.createTransaction(rule, cursor);
      cursor = this.calculateNextDate(cursor, rule.frequency, rule.interval);
    }
    return cursor;
  }

  private async createTransaction(rule: any, date: Date) {
    const exists = await this.prisma.transaction.findFirst({
      where: { recurrenceId: rule.id, date: date }
    });

    if (!exists) {
      await this.prisma.transaction.create({
        data: {
          amount: rule.originalAmount,
          description: rule.description,
          date: date, 
          createdAt: new Date(),
          type: Number(rule.originalAmount) < 0 ? 'EXPENSE' : 'INCOME',
          isPaid: true,
          userId: rule.userId,
          recurrenceId: rule.id,
          categoryId: rule.categoryId
        }
      });
    }
  }

  private calculateNextDate(current: Date, frequency: string, interval: number): Date {
    switch (frequency) {
      case 'DAILY': return addDays(current, interval);
      case 'WEEKLY': return addWeeks(current, interval);
      case 'MONTHLY': return addMonths(current, interval);
      case 'YEARLY': return addYears(current, interval);
      default: return addMonths(current, 1);
    }
  }
}