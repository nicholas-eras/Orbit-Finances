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
  max, // Importante para definir onde começa a projeção
} from 'date-fns';

import { PrismaService } from 'src/prisma/prisma.service';

type ProjectionPoint = {
  x: string;
  y: number;
};

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Gera os dados do Dashboard respeitando o mês selecionado (month/year).
   */
  async getDashboardData(userId: string, month: number, year: number) {
    // 1. DEFINIÇÃO DE DATAS
    // A data baseada no filtro do usuário (ex: 01/02/2026)
    const viewDate = new Date(year, month - 1, 1);
    
    // Intervalo do mês visualizado
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    
    // A data de "Hoje" real (para separar Realizado de Projetado no gráfico)
    const today = startOfDay(new Date());

    // 2. BUSCA DE DADOS (Parallel)
    const [allTransactions, activeRecurrences, userSettings, previousBalanceAgg] = await Promise.all([
      // A: Transações apenas do mês selecionado (Extrato)
      this.prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: monthStart, lte: monthEnd },
        },
        orderBy: { date: 'asc' },
      }),

      // B: Regras de recorrência ativas neste período
      // (Começam antes do fim do mês E (não terminaram OU terminam depois do começo do mês))
      this.prisma.recurrenceRule.findMany({
        where: {
          userId,
          startDate: { lte: monthEnd },
          OR: [{ endDate: null }, { endDate: { gte: monthStart } }],
        },
      }),

      // C: Configurações do usuário (Meta de economia)
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { savingsGoal: true },
      }),

      // D: Saldo Acumulado ANTERIOR ao mês selecionado
      // Isso é vital: se estou vendo Fevereiro, preciso saber com quanto terminei Janeiro.
      this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          date: { lt: monthStart }, // Tudo antes do dia 1 do mês atual
        },
      }),
    ]);

    // 3. CÁLCULO DO "REALIZADO" (O que está no banco neste mês)
    let monthRealizedIncome = 0;
    let monthRealizedExpense = 0;

    allTransactions.forEach((t) => {
      const val = Number(t.amount);
      if (val > 0) monthRealizedIncome += val;
      else monthRealizedExpense += val;
    });

    // 4. CÁLCULO DA PROJEÇÃO (O que falta acontecer)
    
    // Define o ponto de corte:
    // Se o mês é passado: monthStart é antes de hoje, mas monthEnd também.
    // Se monthEnd < today, não projetamos nada (o mês já acabou).
    // Se monthStart > today, projetamos desde o dia 1.
    // Se estamos no mês atual, projetamos de Amanhã (today + 1).
    
    const projectionStart = max([monthStart, addDays(today, 1)]);

    // Gera lista de contas futuras baseadas nas regras
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

    // Pegamos o saldo que veio do passado (Janeiro, Dezembro, etc...)
    const startingBalance = Number(previousBalanceAgg._sum.amount || 0);

    // CORREÇÃO 1: O saldo realizado (hoje) deve incluir o passado
    const realizedBalance = startingBalance + monthRealizedIncome + monthRealizedExpense;

    // CORREÇÃO 2: O saldo projetado (fim do mês) deve incluir o passado + o futuro
    // Antes estava apenas: projectedMonthIncome + projectedMonthExpense
    const projectedMonthBalance = startingBalance + projectedMonthIncome + projectedMonthExpense;

    // 6. CONSTRUÇÃO DO GRÁFICO (Fluxo de Caixa Diário)
    // Aqui já estava certo, pois você usava 'runningBalance' que começava com o saldo anterior
    let runningBalance = startingBalance; // Use a variável que criamos acima pra ficar limpo
    const chartData: ProjectionPoint[] = [];
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Cache: Gera todas as recorrências do mês para checagem rápida no loop
    const fullMonthRecurrences = this.projectRecurrences(
      activeRecurrences,
      monthStart,
      monthEnd,
    );

    

    for (const day of daysInMonth) {
      let dailyChange = 0;

      // A. Soma o Real (Banco de Dados)
      // Cobre o passado e agendamentos manuais futuros
      allTransactions
        .filter((t) => isSameDay(new Date(t.date), day))
        .forEach((t) => (dailyChange += Number(t.amount)));

      // B. Soma a Projeção (Regras)
      // Só aplica a regra se o dia for no FUTURO em relação a HOJE.
      // Se eu olhar o mês passado, isso nunca é true (gráfico fica 100% real).
      if (isAfter(day, today)) {
        fullMonthRecurrences
          .filter((r) => isSameDay(r.date, day))
          .forEach((r) => (dailyChange += r.amount));
      }

      runningBalance += dailyChange;

      chartData.push({
        x: day.toISOString().split('T')[0],
        y: Number(runningBalance.toFixed(2)),
      });
    }

    // 6. SAÚDE FINANCEIRA
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
          balance: realizedBalance, // <--- Agora inclui o histórico
        },
        projected: {
          income: projectedMonthIncome,
          expense: projectedMonthExpense,
          balance: projectedMonthBalance, // <--- Agora inclui o histórico
        },
        endOfMonth: {
          balance: projectedMonthBalance, // <--- O Card "Saldo Previsto" vai ler isso aqui
        },
      },
      chartData,
      health,
    };
  }

  // --- MÉTODOS AUXILIARES ---

  /**
   * Expande regras de recorrência (ex: "Semanal") em datas específicas dentro de um intervalo.
   */
  private projectRecurrences(rules: any[], start: Date, end: Date) {
    // Se o inicio for depois do fim (ex: vendo mês passado), retorna vazio
    if (isAfter(start, end)) return [];

    const occurrences: { date: Date; amount: number; description: string }[] = [];

    rules.forEach((rule) => {
      const amount = Number(rule.originalAmount);
      let cursor = startOfDay(new Date(rule.startDate));

      // Loop de tempo: avança o cursor conforme a frequência até passar do fim do mês
      while (isBefore(cursor, end) || isSameDay(cursor, end)) {
        
        // Se o cursor estiver dentro da janela desejada [start, end], adiciona à lista
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

        // Avança para a próxima data
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
   * Lógica simples para determinar se a saúde financeira está boa.
   */
  private calculateHealth(
    balance: number,
    income: number,
    expense: number,
    goal: number,
  ): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    // Se fechar no vermelho -> Crítico
    if (balance < 0) return 'CRITICAL';

    const savings = income - Math.abs(expense);
    // Evita divisão por zero
    const savingsRate = income > 0 ? savings / income : 0;

    // Se sobrar menos de 10% -> Atenção
    if (savingsRate < 0.1) return 'WARNING';
    
    // Se não atingir a meta do usuário -> Atenção
    if (goal > 0 && savings < goal) return 'WARNING';

    return 'HEALTHY';
  }
}