import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetDashboardDto } from './dto/get-dashboard.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { 
  addDays, addWeeks, addMonths, addYears, 
  isWithinInterval, parseISO, startOfDay, endOfDay, format, 
  startOfMonth,
  endOfMonth
} from 'date-fns';
import { CreateBatchDto } from './dto/create-batch.dto';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async update(id: string, userId: string, data: Partial<CreateTransactionDto>) {
    const dataToUpdate: any = {
      description: data.description,
      amount: data.amount,
      type: data.type,
      categoryId: data.categoryId,
      isPaid: data.isPaid
    };

    // Se vier data nova, converte
    if (data.date) {
      dataToUpdate.date = new Date(data.date);
    }

    // Lógica para garantir sinal correto (Entrada vs Saída)
    if (data.amount !== undefined) {
       let finalAmount = Math.abs(data.amount);
       // Se o tipo for EXPENSE ou se não veio tipo mas o valor original era negativo...
       // Aqui simplificamos: confiamos no 'type' enviado pelo front ou mantemos a lógica de expense = negativo
       if (data.type === 'EXPENSE') {
         finalAmount = -finalAmount;
       }
       dataToUpdate.amount = finalAmount;
    }

    const result = await this.prisma.transaction.updateMany({
      where: {
        id: id,
        userId: userId, // Segurança: só edita se for do usuário
      },
      data: dataToUpdate,
    });

    if (result.count === 0) {
      throw new NotFoundException('Transação não encontrada.');
    }

    return { message: 'Transação atualizada com sucesso' };
  }

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
    // 1. Definir o intervalo de busca
    let start = new Date(0); // Início dos tempos se não passar filtro
    let end = new Date(2100, 0, 1); // Futuro distante

    if (month && year) {
      const dateRef = new Date(year, month - 1, 1); // Javascript conta meses 0-11
      start = startOfMonth(dateRef);
      end = endOfMonth(dateRef);
    }

    // 2. Buscar Transações REAIS (Do banco)
    const realTransactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      include: { category: true },
    });

    // Adiciona uma flag para o front saber que é real
    const mappedReal = realTransactions.map(tx => ({
      ...tx,
      isProjected: false, 
      virtualId: tx.id // Usa o ID real
    }));

    // 3. Buscar Recorrências para PROJETAR (Futuro)
    const recurrences = await this.prisma.recurrenceRule.findMany({ 
      where: { userId },
      include: { category: true } // Importante trazer a categoria
    });

    const projectedTransactions: any[] = [];

    for (const rule of recurrences) {
      let cursor = rule.nextRun; // Começa a projetar da próxima execução agendada

      // Se a regra já "passou" do fim do mês selecionado, nem processa
      if (cursor > end) continue;

      // Loop de projeção (Similar ao do gráfico)
      while (cursor <= end) {
        // Só adiciona se cair DENTRO do mês que o usuário pediu
        // E se for maior ou igual ao nextRun (para não duplicar passado)
        if (cursor >= start) {
            
          projectedTransactions.push({
            // Cria um ID falso para o React não reclamar da Key
            id: `proj_${rule.id}_${format(cursor, 'yyyyMMdd')}`, 
            virtualId: null, // Indica que não tem ID no banco ainda
            description: rule.description, // Opcional: concatenar no texto
            amount: Number(rule.originalAmount),
            type: Number(rule.originalAmount) < 0 ? 'EXPENSE' : 'INCOME',
            date: new Date(cursor), // Clona a data
            categoryId: rule.categoryId,
            category: rule.category, // Passa a categoria da regra
            isPaid: false, // Futuro = não pago
            isProjected: true, // A FLAG MÁGICA
            recurrenceId: rule.id
          });
        }

        // Avança data
        switch (rule.frequency) {
          case 'DAILY': cursor = addDays(cursor, rule.interval); break;
          case 'WEEKLY': cursor = addWeeks(cursor, rule.interval); break;
          case 'MONTHLY': cursor = addMonths(cursor, rule.interval); break;
          case 'YEARLY': cursor = addYears(cursor, rule.interval); break;
          default: cursor = addMonths(cursor, 1);
        }
      }
    }

    // 4. Unir e Ordenar
    // Junta as reais + projetadas e ordena por data descrescente (mais recente primeiro)
    const allItems = [...mappedReal, ...projectedTransactions].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return allItems;
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

  async createBatch(userId: string, dto: CreateBatchDto) {
    // 1. Extrair as datas únicas do payload para limitar a busca no banco
    const dates = dto.transactions.map(t => t.date); // ['2026-01-13', '2026-01-12'...]
    
    // Pegamos a menor e a maior data para fazer um range search (mais performático)
    const sortedDates = dates.sort();
    const minDateStr = sortedDates[0];
    const maxDateStr = sortedDates[sortedDates.length - 1];
    console.log("tes");
    // Precisamos converter para Date object para consultar o Prisma
    // Usamos startOfDay no min e endOfDay no max para garantir pegar tudo
    const searchStart = startOfDay(parseISO(minDateStr));
    const searchEnd = endOfDay(parseISO(maxDateStr));

    return this.prisma.$transaction(async (tx) => {
      // 2. Buscar transações JÁ EXISTENTES nesse intervalo de tempo
      const existingTransactions = await tx.transaction.findMany({
        where: {
          userId,
          date: { gte: searchStart, lte: searchEnd }
        }
      });

      // 3. Criar um Set de assinaturas das transações existentes
      // Formato da chave: "YYYY-MM-DD|AMOUNT|DESCRIPTION"
      const existingSignatures = new Set(
        existingTransactions.map(t => {
          const dateStr = format(t.date, 'yyyy-MM-dd'); // date-fns
          return `${dateStr}|${t.amount}|${t.description.trim()}`;
        })
      );

      // 4. Filtrar o payload: Só mantém o que NÃO está no Set
      const newTransactions = dto.transactions.filter(t => {
        const signature = `${t.date}|${t.amount}|${t.description.trim()}`;
        
        // Se já existe, retorna false (filtra fora)
        if (existingSignatures.has(signature)) {
          return false; 
        }
        
        // Se não existe, retorna true (mantém na lista de criação)
        return true;
      });

      if (dto.bankBalance !== undefined && dto.bankBalance !== null) {      
        await tx.user.update({
          where: { id: userId },
          data: {            
            lastBankBalance: dto.bankBalance,             
            lastBankBalanceDate: new Date() 
          }
        });
      }

      const duplicatedTransactions = dto.transactions.length - newTransactions.length;

      if (newTransactions.length === 0) {
        return { count: 0, message: "Todas as transações já foram importadas anteriormente." };
      }

      // 5. Salva apenas as novas
      await tx.transaction.createMany({
        data: newTransactions.map((t) => ({
          userId,
          description: t.description,
          amount: t.amount,
          // Aquele fix do Timezone que combinamos
          date: new Date(t.date + 'T12:00:00'), 
          type: t.type,
          categoryId: t.categoryId,
          isPaid: true
        }))
      });

      return { 
        count: newTransactions.length,
        message: duplicatedTransactions > 0 ? `Transações já existentes: ${duplicatedTransactions} ` : ""
      };
    });
  }
}