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
} from 'date-fns';

import { PrismaService } from 'src/prisma/prisma.service';

type ProjectionPoint = {
  x: string;
  y: number;
};

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData(userId: string) {
    // Datas de Referência
    const today = startOfDay(new Date());
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    // 1. CARGA DE DADOS
    // Buscamos transações (passado + hoje auto-gerado pelo Cron)
    // Buscamos regras (apenas para projetar de amanhã em diante)
    const [allTransactions, activeRecurrences, userSettings] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      }),
      this.prisma.recurrenceRule.findMany({
        where: { userId, endDate: null },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { savingsGoal: true },
      }),
    ]);

    // 2. CÁLCULO DO "REALIZADO" (Mês Atual)
    // Inclui tudo que está na tabela Transaction dentro deste mês.
    // Graças ao Cron, isso inclui as contas recorrentes que vencem hoje ou antes.
    let monthRealizedIncome = 0;
    let monthRealizedExpense = 0;

    allTransactions.forEach((t) => {
      const val = Number(t.amount);
      const tDate = new Date(t.date);

      if (tDate >= monthStart && tDate <= monthEnd) {
        if (val > 0) monthRealizedIncome += val;
        else monthRealizedExpense += val;
      }
    });

    // 3. PROJEÇÃO DO FUTURO (O que falta acontecer?)
    // IMPORTANTE: Começamos a projetar de AMANHÃ (addDays(today, 1)).
    // Motivo: As de hoje já viraram Transactions pelo Cron Job.
    const pendingOccurrences = this.projectRecurrences(
      activeRecurrences,
      addDays(today, 1),
      monthEnd,
    );

    let projectedMonthIncome = monthRealizedIncome;
    let projectedMonthExpense = monthRealizedExpense;

    pendingOccurrences.forEach((o) => {
      if (o.amount > 0) projectedMonthIncome += o.amount;
      else projectedMonthExpense += o.amount;
    });

    const projectedMonthBalance = projectedMonthIncome + projectedMonthExpense;

    // 4. CONSTRUÇÃO DO GRÁFICO (Linha do Tempo Completa)
    
    // A. Saldo Inicial (Acumulado de toda a história antes deste mês)
    let runningBalance = 0;
    allTransactions.forEach((t) => {
      if (isBefore(new Date(t.date), monthStart)) {
        runningBalance += Number(t.amount);
      }
    });

    const chartData:ProjectionPoint[] = [];
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Cache: Gera projeções do mês inteiro para checagem rápida no loop
    const futureRecurrencesCache = this.projectRecurrences(
      activeRecurrences,
      monthStart,
      monthEnd,
    );

    // B. Loop Dia a Dia
    for (const day of daysInMonth) {
      let dailyChange = 0;

      // Soma Transações REAIS (Existentes no Banco)
      // Cobre: Passado, Hoje e eventuais agendamentos futuros manuais
      allTransactions
        .filter((t) => isSameDay(new Date(t.date), day))
        .forEach((t) => (dailyChange += Number(t.amount)));

      // Soma Recorrências PROJETADAS (Apenas Futuro)
      // Cobre: Amanhã em diante. Evita duplicar o que o Cron já gerou hoje.
      if (isAfter(day, today)) {
        futureRecurrencesCache
          .filter((r) => isSameDay(r.date, day))
          .forEach((r) => (dailyChange += r.amount));
      }

      runningBalance += dailyChange;

      chartData.push({
        x: day.toISOString().split('T')[0],
        y: Number(runningBalance.toFixed(2)),
      });
    }

    // 5. SAÚDE FINANCEIRA
    const health = this.calculateHealth(
      projectedMonthBalance,
      projectedMonthIncome,
      projectedMonthExpense,
      Number(userSettings?.savingsGoal || 0),
    );

    return {
      summary: {
        realized: {
          income: monthRealizedIncome,
          expense: monthRealizedExpense,
          balance: monthRealizedIncome + monthRealizedExpense,
        },
        projected: {
          income: projectedMonthIncome,
          expense: projectedMonthExpense,
          balance: projectedMonthBalance,
        },
        endOfMonth: {
          balance: projectedMonthBalance,
        },
      },
      chartData,
      health,
    };
  }

  // --- MOTORES AUXILIARES ---

  /**
   * Gera ocorrências virtuais baseadas nas regras de recorrência.
   */
  private projectRecurrences(rules: any[], start: Date, end: Date) {
    // Se a data de início for depois do fim, não há nada a projetar
    if (isAfter(start, end)) return [];

    const occurrences: { date: Date; amount: number; description: string }[] = [];

    rules.forEach((rule) => {
      const amount = Number(rule.originalAmount);
      let cursor = startOfDay(new Date(rule.startDate));

      // Loop temporal avançando a data conforme a frequência
      while (isBefore(cursor, end) || isSameDay(cursor, end)) {
        
        // Só adiciona se o cursor estiver dentro da janela solicitada (start -> end)
        if (
          (isAfter(cursor, start) || isSameDay(cursor, start)) &&
          (isBefore(cursor, end) || isSameDay(cursor, end))
        ) {
          occurrences.push({
            date: new Date(cursor),
            amount,
            description: rule.description,
          });
        }

        // Próxima data
        switch (rule.frequency) {
          case 'DAILY':
            cursor = addDays(cursor, rule.interval);
            break;
          case 'WEEKLY':
            cursor = addWeeks(cursor, rule.interval);
            break;
          case 'MONTHLY':
            cursor = addMonths(cursor, rule.interval);
            break;
          case 'YEARLY':
            cursor = addYears(cursor, rule.interval);
            break;
          default:
            cursor = addMonths(cursor, 1);
        }
      }
    });

    return occurrences;
  }

  /**
   * Lógica de Diagnóstico Financeiro
   */
  private calculateHealth(
    balance: number,
    income: number,
    expense: number,
    goal: number,
  ): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    // 1. Vai fechar no vermelho?
    if (balance < 0) return 'CRITICAL';

    const savings = income - Math.abs(expense);
    const savingsRate = income > 0 ? savings / income : 0;

    // 2. Está economizando menos de 10% da renda?
    if (savingsRate < 0.1) return 'WARNING';
    
    // 3. Não vai bater a meta definida pelo usuário?
    if (goal > 0 && savings < goal) return 'WARNING';

    return 'HEALTHY';
  }
}