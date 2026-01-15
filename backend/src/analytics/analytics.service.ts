import { Injectable } from '@nestjs/common';
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isSameDay,
  isBefore,
  isAfter,
  eachDayOfInterval,
  max,
} from 'date-fns';

import { PrismaService } from 'src/prisma/prisma.service';

type ProjectionPoint = {
  x: string;
  y: number;
};

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(userId: string, month: number, year: number) {
    const viewDate = new Date(year, month - 1, 1);
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const today = startOfDay(new Date());

    // 1. BUSCA NO BANCO
    const [allTransactions, activeRecurrences, userSettings, previousBalanceAgg] = await Promise.all([
      // Transações do Mês (Realizadas)
      this.prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: monthStart, lte: monthEnd },
        },
        orderBy: { date: 'asc' },
        include: { category: true },
      }),

      // Regras de Recorrência
      this.prisma.recurrenceRule.findMany({
        where: {
          userId,
          startDate: { lte: monthEnd },
          OR: [{ endDate: null }, { endDate: { gte: today } }],
        },
        include: { category: true },
      }),

      this.prisma.user.findUnique({ where: { id: userId }, select: { savingsGoal: true } }),

      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId, date: { lt: monthStart } },
      }),
    ]);

    // 2. CÁLCULO DO GAP (Apenas para ajustar o SALDO INICIAL)
    let startingBalance = Number(previousBalanceAgg._sum.amount || 0);
    
    // O Gap não deve ir para o gráfico de categorias, apenas para o saldo
    if (isAfter(monthStart, today)) {
      const gapStart = addDays(today, 1);
      const gapEnd = addDays(monthStart, -1);

      if (isBefore(gapStart, gapEnd) || isSameDay(gapStart, gapEnd)) {
        const gap = this.projectRecurrences(activeRecurrences, gapStart, gapEnd);
        gap.forEach(occ => {
          startingBalance += occ.amount; 
        });
      }
    }

    // 3. MOVIMENTAÇÃO DO MÊS (REALIZADO)
    let monthRealizedIncome = 0;
    let monthRealizedExpense = 0;

    allTransactions.forEach((t) => {
      const val = Number(t.amount);
      if (val > 0) monthRealizedIncome += val;
      else monthRealizedExpense += val;
    });

    // 4. MOVIMENTAÇÃO DO MÊS (PROJETADO)
    const projectionStart = max([monthStart, addDays(today, 1)]);
    
    // Apenas ocorrências DENTRO do mês selecionado
    const pendingOccurrences = this.projectRecurrences(
      activeRecurrences,
      projectionStart,
      monthEnd,
    );

    let projectedMonthIncome = monthRealizedIncome;
    let projectedMonthExpense = monthRealizedExpense;

    pendingOccurrences.forEach((o) => {
      if (o.amount > 0) projectedMonthIncome += o.amount;
      else projectedMonthExpense += o.amount;
    });

    const monthResult = projectedMonthIncome + projectedMonthExpense;
    const finalBalance = startingBalance + monthResult;

    // 5. GRÁFICO DIÁRIO
    let runningBalance = startingBalance;
    const chartData: ProjectionPoint[] = [];
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const fullMonthRecurrences = this.projectRecurrences(activeRecurrences, monthStart, monthEnd);

    for (const day of daysInMonth) {
      let dailyChange = 0;

      // Soma Real
      allTransactions
        .filter((t) => isSameDay(new Date(t.date), day))
        .forEach((t) => (dailyChange += Number(t.amount)));

      // Soma Projetado
      if (isAfter(day, today)) {
        fullMonthRecurrences
          .filter((r) => isSameDay(r.date, day))
          .forEach((r) => (dailyChange += r.amount));
      }

      runningBalance += dailyChange;
      chartData.push({ x: day.toISOString().split('T')[0], y: Number(runningBalance.toFixed(2)) });
    }

    // 6. CATEGORIAS (GRÁFICO DE ROSCA) - CORRIGIDO
    // Antes estava somando o GAP aqui. Agora removemos.
    const categoryBreakdown = this.calculateCategoryBreakdown(
      allTransactions,    // Transações reais DESTE mês
      pendingOccurrences  // Projeções futuras apenas DESTE mês
    );

    // 7. RETORNO
    const health = this.calculateHealth(finalBalance, projectedMonthIncome, projectedMonthExpense, Number(userSettings?.savingsGoal || 0));

    // 8 salario final
    const user = await this.prisma.user.findUnique({
      where:{
        id: userId
      }
    });

    return {
      summary: {
        realized: {
          income: monthRealizedIncome,
          expense: monthRealizedExpense,
          balance: startingBalance + monthRealizedIncome + monthRealizedExpense,
        },
        projected: {
          income: projectedMonthIncome,
          expense: projectedMonthExpense,
          balance: finalBalance,
        },
        endOfMonth: {
          finalBalance,
          monthResult,
        },
      },
      chartData,
      categories: categoryBreakdown,
      health,
      bankBalance: {
        balance: user.lastBankBalance,
        date: user.lastBankBalanceDate
      }
    };
  }

  // --- MÉTODOS AUXILIARES (Sem alterações) ---

  private calculateCategoryBreakdown(realTransactions: any[], projected: any[]) {
    const map = new Map<string, { name: string; color: string; amount: number }>();

    const processItem = (cat, amount) => {
      if (amount >= 0) return; // Só despesas
      const catId = cat?.id || 'uncategorized';
      const catName = cat?.name || 'Sem Categoria';
      const catColor = cat?.color || '#94a3b8';
      const absAmount = Math.abs(amount);

      if (!map.has(catId)) {
        map.set(catId, { name: catName, color: catColor, amount: 0 });
      }
      map.get(catId)!.amount += absAmount;
    };

    realTransactions.forEach(t => processItem(t.category, Number(t.amount)));
    projected.forEach(p => processItem(p.category, p.amount));

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }

  private projectRecurrences(rules: any[], start: Date, end: Date) {
    if (isAfter(start, end)) return [];
    
    const occurrences: { date: Date; amount: number; description: string; category: any }[] = [];

    rules.forEach((rule) => {
      const amount = Number(rule.originalAmount);
      let cursor = startOfDay(new Date(rule.startDate));

      while (isBefore(cursor, end) || isSameDay(cursor, end)) {
        const inWindow = 
          (isAfter(cursor, start) || isSameDay(cursor, start)) &&
          (isBefore(cursor, end) || isSameDay(cursor, end));

        if (inWindow) {
          occurrences.push({ date: new Date(cursor), amount, description: rule.description, category: rule.category });
        }

        switch (rule.frequency) {
          case 'DAILY': cursor = addDays(cursor, rule.interval); break;
          case 'WEEKLY': cursor = addWeeks(cursor, rule.interval); break;
          case 'MONTHLY': cursor = addMonths(cursor, rule.interval); break;
          case 'YEARLY': cursor = addYears(cursor, rule.interval); break;
          default: cursor = addMonths(cursor, 1);
        }
      }
    });
    return occurrences;
  }

  private calculateHealth(balance: number, income: number, expense: number, goal: number): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    if (balance < 0) return 'CRITICAL';
    const savings = income - Math.abs(expense);
    const savingsRate = income > 0 ? savings / income : 0;
    if (savingsRate < 0.1) return 'WARNING';
    if (goal > 0 && savings < goal) return 'WARNING';
    return 'HEALTHY';
  }
}