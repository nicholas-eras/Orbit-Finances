import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateRecurrenceDto } from './dto/create-recurrence.dto';
import { startOfDay, addDays, addMonths, addWeeks, addYears, isBefore, isAfter, isSameDay } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RecurrencesService {
  private readonly logger = new Logger(RecurrencesService.name);

  constructor(private prisma: PrismaService) {}

  // ======================================================
  // 1. CRIAÇÃO INTELIGENTE (Backfill + Setup do Futuro)
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
        nextRun: startDate, // Começa igual ao início
        categoryId: dto.categoryId,
      },
    });

    // 1. Faz o Backfill (cobre o buraco de "startDate" até "hoje")
    // O retorno dessa função já será a PRÓXIMA data futura correta
    const nextFutureDate = await this.processBackfillAndGetNext(rule);

    // 2. Atualiza o nextRun no banco para essa data futura
    // Assim o Cron de amanhã já sabe exatamente quando agir
    await this.prisma.recurrenceRule.update({
      where: { id: rule.id },
      data: { nextRun: nextFutureDate }
    });

    return rule;
  }

  async findAll(userId: string) {
    return this.prisma.recurrenceRule.findMany({ where: { userId } });
  }

  // ======================================================
  // 2. O CRON JOB OTIMIZADO (A "Solução 2")
  // ======================================================
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyCron() {    
    const today = startOfDay(new Date());

    // BUSCA OTIMIZADA: Só traz quem já venceu (ou vence hoje)
    const rulesToProcess = await this.prisma.recurrenceRule.findMany({
      where: { 
        endDate: null,
        nextRun: { lte: today } // <= HOJE
      }
    });

    this.logger.log(`Processando ${rulesToProcess.length} recorrências...`);

    for (const rule of rulesToProcess) {
      // 1. Cria a transação (Sabemos que é devida, pois nextRun <= hoje)
      await this.createTransaction(rule, rule.nextRun);

      // 2. Calcula a nova data futura
      const nextDate = this.calculateNextDate(rule.nextRun, rule.frequency, rule.interval);

      // 3. Atualiza o marcador "nextRun" no banco
      await this.prisma.recurrenceRule.update({
        where: { id: rule.id },
        data: { nextRun: nextDate }
      });
    }
  }

  // ======================================================
  // MÉTODOS AUXILIARES (A Mágica acontece aqui)
  // ======================================================

  // Função que faz o "Backfill" e descobre qual é a primeira data do futuro
  private async processBackfillAndGetNext(rule: any): Promise<Date> {
    let cursor = startOfDay(new Date(rule.startDate));
    const today = startOfDay(new Date());

    // Enquanto o cursor for passado ou hoje...
    while (isBefore(cursor, today) || isSameDay(cursor, today)) {
      // Cria a transação desse dia
      await this.createTransaction(rule, cursor);

      // Avança o cursor
      cursor = this.calculateNextDate(cursor, rule.frequency, rule.interval);
    }

    // Quando o loop termina, o "cursor" é exatamente a primeira data do FUTURO.
    return cursor;
  }

  // Função simples para criar a transação (extraída para não repetir código)
  private async createTransaction(rule: any, date: Date) {
    // Verifica duplicidade para garantir (Idempotência)
    const exists = await this.prisma.transaction.findFirst({
      where: { recurrenceId: rule.id, date: date }
    });

    if (!exists) {
      await this.prisma.transaction.create({
        data: {
          amount: rule.originalAmount,
          description: rule.description,
          date: date, // Usa a data calculada (do nextRun ou do backfill)
          createdAt: new Date(), // Data real de criação (audit)
          type: Number(rule.originalAmount) < 0 ? 'EXPENSE' : 'INCOME',
          isPaid: true,
          userId: rule.userId,
          recurrenceId: rule.id,
          categoryId: rule.categoryId
        }
      });
    }
  }

  // A matemática de pular datas
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