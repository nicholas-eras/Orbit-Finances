import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetDashboardDto } from './dto/get-dashboard.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { 
  addDays, addWeeks, addMonths, addYears, 
  isWithinInterval, parseISO, startOfDay, endOfDay 
} from 'date-fns';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  // ===========================================================================
  // 1. DADOS PARA O GRÁFICO (Separado em 2 Datasets)
  // ===========================================================================
  async getBarChartData(userId: string, dto: GetDashboardDto) {
    const summaryMap = await this._calculateBalanceByCategory(userId, dto);

    const labels: string[] = [];
    const expenseData: number[] = [];
    const incomeData: number[] = [];
    const backgroundColors: string[] = [];

    // Filtra categorias que tiveram alguma movimentação (entrada OU saída)
    const activeItems = Array.from(summaryMap.values())
      // Ordena pelo volume total (quem teve mais movimentação aparece primeiro)
      .sort((a, b) => (b.expense + b.income) - (a.expense + a.income));

    activeItems.forEach(item => {
      labels.push(item.name);
      // Dataset 1: Despesas (sempre positivo para o gráfico, ou negativo se preferir visual "espelhado")
      expenseData.push(Number(item.expense.toFixed(2))); 
      // Dataset 2: Receitas
      incomeData.push(Number(item.income.toFixed(2)));
      // Cor da categoria
      backgroundColors.push(item.color);
    });

    return {
      labels,
      datasets: [
        {
          label: 'Despesas',
          data: expenseData,
          backgroundColor: '#ef4444', // Vermelho fixo para despesas (ou use backgroundColors se quiser colorido)
          borderRadius: 4,
          stack: 'stack1' // (Opcional) Deixa uma barra do lado da outra ou empilhada
        },
        {
          label: 'Entradas',
          data: incomeData,
          backgroundColor: '#10b981', // Verde fixo para entradas
          borderRadius: 4,
          stack: 'stack2'
        }
      ]
    };
  }

  // ===========================================================================
  // 2. LISTA SIMPLES (Retorna os dois valores brutos)
  // ===========================================================================
  async getExpensesByCategory(userId: string, dto: GetDashboardDto) {
    const summaryMap = await this._calculateBalanceByCategory(userId, dto);

    // Retorna array ordenado por despesa
    return Array.from(summaryMap.values())
      .sort((a, b) => b.expense - a.expense);
  }

  // ===========================================================================
  // 3. LÓGICA CORE (Separando Income e Expense)
  // ===========================================================================
  private async _calculateBalanceByCategory(userId: string, dto: GetDashboardDto) {
    const start = startOfDay(parseISO(dto.startDate));
    const end = endOfDay(parseISO(dto.endDate));

    // A. Categorias
    const categories = await this.prisma.category.findMany({ where: { userId } });

    // Mapa agora guarda { expense, income }
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

    // B. Transações Reais (TODAS: Expense e Income)
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        // REMOVI O FILTRO 'type: EXPENSE'. Agora pega tudo.
        date: { gte: start, lte: end },
      },
    });
    
    transactions.forEach((tx) => {
      const catId = tx.categoryId || 'uncategorized';
      const entry = summary.get(catId);
      
      if (entry) {
        const val = Number(tx.amount);
        if (val < 0) {
          // É Despesa
          entry.expense += Math.abs(val);
        } else {
          // É Receita
          entry.income += val;
        }
      }
    });

    // C. Recorrências (Projeção)
    const recurrences = await this.prisma.recurrenceRule.findMany({ where: { userId } });

    for (const rule of recurrences) {
      let cursor = rule.startDate;
      
      // Verifica se o valor original da regra é negativo (despesa) ou positivo (entrada)
      const ruleVal = Number(rule.originalAmount);
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

        // Lógica de Avanço de Data
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

  // ... CRUD MANTIDO IGUAL ...
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
}