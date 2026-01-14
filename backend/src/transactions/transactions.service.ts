import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetDashboardDto } from './dto/get-dashboard.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { 
  addDays, addWeeks, addMonths, addYears, 
  isWithinInterval, parseISO, startOfDay, endOfDay, format 
} from 'date-fns';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  // ===========================================================================
  // 1. DADOS PARA O GRÁFICO DE ÁREA (Time Series: Evolução do Saldo)
  // ===========================================================================
  // Retorna um array puro: [{ x: '2023-01-01...', y: 1500 }, ...]
  async getBarChartData(userId: string, dto: GetDashboardDto) {
    const start = startOfDay(parseISO(dto.startDate));
    const end = endOfDay(parseISO(dto.endDate));
    // Mapa para agrupar o "Fluxo Líquido" de cada dia
    // Chave: 'YYYY-MM-DD', Valor: number (positivo ou negativo)
    const dailyChangeMap = new Map<string, number>();

    // Função auxiliar para somar valor no dia
    const addToDate = (date: Date, amount: number) => {
      const key = format(date, 'yyyy-MM-dd');
      const current = dailyChangeMap.get(key) || 0;
      dailyChangeMap.set(key, current + amount);
    };

    // A. Buscar Transações Reais no Período
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
    });

    transactions.forEach((tx) => {
      let val = Number(tx.amount);
      // Garante sinal correto baseando-se no tipo
      if (tx.type === 'EXPENSE') {
        val = -Math.abs(val);
      } else if (tx.type === 'INCOME') {
        val = Math.abs(val);
      }
      // Se não tiver type (transferências etc), assume o sinal que veio do banco

      addToDate(tx.date, val);
    });

    // B. Buscar Recorrências (Projeção) e expandir nas datas
    const recurrences = await this.prisma.recurrenceRule.findMany({ where: { userId } });

    for (const rule of recurrences) {
      let cursor = rule.startDate;
      
      // Tenta inferir se é despesa ou receita pelo valor original
      let ruleVal = Number(rule.originalAmount);
      // Lógica de segurança de sinal (opcional, depende de como você grava a regra)
      // Se você grava a regra sempre positiva e usa categoryId para saber, precisaria verificar aqui.
      // Assumindo que: valor negativo = despesa, valor positivo = entrada.
      
      while (cursor <= end) {
        const inInterval = isWithinInterval(cursor, { start, end });
        const isFuture = cursor >= rule.nextRun; // Só projeta se ainda não virou transação real

        if (inInterval && isFuture) {
           addToDate(cursor, ruleVal);
        }

        // Avançar data conforme frequência
        switch (rule.frequency) {
          case 'DAILY': cursor = addDays(cursor, rule.interval); break;
          case 'WEEKLY': cursor = addWeeks(cursor, rule.interval); break;
          case 'MONTHLY': cursor = addMonths(cursor, rule.interval); break;
          case 'YEARLY': cursor = addYears(cursor, rule.interval); break;
          default: cursor = addMonths(cursor, 1);
        }
      }
    }

    // C. Construir o Array Final (Acumulado Dia a Dia)
    // O gráfico de área geralmente mostra o SALDO no tempo, não apenas a movimentação do dia.
    const result: { x: string; y: number }[] = [];
    
    // Saldo inicial (pode vir de uma query de saldo anterior se quiser precisão total)
    let currentRunningBalance = 0; 

    let loopDate = start;
    while (loopDate <= end) {
      const key = format(loopDate, 'yyyy-MM-dd');
      const dayNetChange = dailyChangeMap.get(key) || 0;

      currentRunningBalance += dayNetChange;

      result.push({
        x: loopDate.toISOString(), // Formato ISO para o ApexCharts
        y: Number(currentRunningBalance.toFixed(2))
      });

      loopDate = addDays(loopDate, 1);
    }

    return result; 
  }

  // ===========================================================================
  // 2. LISTA POR CATEGORIA (Mantida lógica original)
  // ===========================================================================
  async getExpensesByCategory(userId: string, dto: GetDashboardDto) {
    const summaryMap = await this._calculateBalanceByCategory(userId, dto);

    // Retorna array ordenado por despesa (maior gasto primeiro)
    return Array.from(summaryMap.values())
      .sort((a, b) => b.expense - a.expense);
  }

  // ===========================================================================
  // 3. HELPER LÓGICA CORE (Para Categorias)
  // ===========================================================================
  private async _calculateBalanceByCategory(userId: string, dto: GetDashboardDto) {
    const start = startOfDay(parseISO(dto.startDate));
    const end = endOfDay(parseISO(dto.endDate));

    // A. Categorias
    const categories = await this.prisma.category.findMany({ where: { userId } });

    const summary = new Map<string, { 
      name: string; 
      color: string; 
      expense: number; 
      income: number 
    }>();

    // Inicializa
    categories.forEach(cat => {
      summary.set(cat.id, { name: cat.name, color: cat.color, expense: 0, income: 0 });
    });
    summary.set('uncategorized', { name: 'Sem Categoria', color: '#94a3b8', expense: 0, income: 0 });

    // B. Transações
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
    });
    
    transactions.forEach((tx) => {
      const catId = tx.categoryId || 'uncategorized';
      const entry = summary.get(catId);
      
      if (entry) {
        const val = Number(tx.amount);
        if (val < 0 || tx.type === 'EXPENSE') {
          entry.expense += Math.abs(val);
        } else {
          entry.income += val;
        }
      }
    });

    // C. Recorrências
    const recurrences = await this.prisma.recurrenceRule.findMany({ where: { userId } });

    for (const rule of recurrences) {
      let cursor = rule.startDate;
      const ruleVal = Number(rule.originalAmount);
      // Se ruleVal < 0 é despesa
      const isExpense = ruleVal < 0; 

      while (cursor <= end) {
        const inInterval = isWithinInterval(cursor, { start, end });
        const isFuture = cursor >= rule.nextRun;

        if (inInterval && isFuture) {           
           const catId = rule.categoryId || 'uncategorized';
           const entry = summary.get(catId);
           if (entry) {
             if (isExpense) {
               entry.expense += Math.abs(ruleVal);
             } else {
               entry.income += ruleVal;
             }
           }
        }

        switch (rule.frequency) {
          case 'DAILY': cursor = addDays(cursor, rule.interval); break;
          case 'WEEKLY': cursor = addWeeks(cursor, rule.interval); break;
          case 'MONTHLY': cursor = addMonths(cursor, rule.interval); break;
          case 'YEARLY': cursor = addYears(cursor, rule.interval); break;
          default: cursor = addMonths(cursor, 1);
        }
      }
    }

    return summary; 
  }

  // ===========================================================================
  // CRUD PADRÃO
  // ===========================================================================
  async create(userId: string, dto: CreateTransactionDto) {
    let finalAmount = Math.abs(dto.amount);
    if (dto.type === 'EXPENSE') finalAmount = -finalAmount;

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

  async findAll(userId: string, month?: number, year?: number) {
    const where: any = { userId };
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      where.date = { gte: startDate, lt: endDate };
    }
    return this.prisma.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
      take: month && year ? undefined : 20, 
      include: { category: true }
    });
  }

  async remove(id: string, userId: string) {
    const result = await this.prisma.transaction.deleteMany({
      where: {
        id: id,
        userId: userId
      }
    });

    if (result.count === 0) {
      throw new NotFoundException('Transação não encontrada.');
    }

    return { message: 'Transação removida com sucesso' };
  }
}