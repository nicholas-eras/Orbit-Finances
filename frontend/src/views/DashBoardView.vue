<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDashboardStore } from '../stores/dashboard';
import { useTransactionStore } from '../stores/transactions'; // Importar a store de transações

// Componentes
import CategoryManager from '../components/CategoryManager.vue';
import TransactionForm from '../components/TransactionForm.vue';
import TransactionList from '../components/TransactionList.vue';
import RecurrenceManager from '../components/RecurrenceManager.vue';
import BalanceChart from '../components/BalanceChart.vue';
// Novos Componentes
import ExpenseChart from '../components/ExpenseChart.vue';
import MonthSelector from '../components/MonthSelector.vue';

const dashStore = useDashboardStore();
const txStore = useTransactionStore();

// --- 1. ESTADO DE DATA (O Maestro) ---
const currentDate = ref(new Date());

// --- 2. OBSERVADOR DE MUDANÇA DE MÊS ---
// Sempre que 'currentDate' mudar (pelo MonthSelector), recarregamos tudo.
watch(currentDate, async (newDate) => {
  // Convertemos para string ISO simples 'YYYY-MM' ou enviamos o Date, 
  // dependendo de como suas stores esperam. Vou assumir que aceitam o Date.
  await Promise.all([
    dashStore.fetchDashboard(newDate),
    txStore.fetchTransactions(newDate)
  ]);
}, { immediate: true }); // 'immediate' faz rodar na primeira vez que abre a tela


const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });


// --- 3. LÓGICA DO GRÁFICO DE ROSCA (Doughnut) ---
// Calcula os gastos baseados na lista de transações carregada
const expenseChartConfig = computed(() => {
  const expenses = txStore.list.filter(t => t.type === 'EXPENSE' || Number(t.amount) < 0);
  
  // Agrupar por Categoria
  const grouped: Record<string, { amount: number, color: string }> = {};

  expenses.forEach(tx => {
    // Se não tiver categoria, agrupa em "Outros"
    const catName = tx.category?.name || 'Sem Categoria';
    const catColor = tx.category?.color || '#94a3b8'; // Cinza padrão
    const val = Math.abs(Number(tx.amount)); // Pega valor positivo para o gráfico

    if (!grouped[catName]) {
      grouped[catName] = { amount: 0, color: catColor };
    }
    grouped[catName].amount += val;
  });

  return {
    labels: Object.keys(grouped),
    data: Object.values(grouped).map(i => i.amount),
    colors: Object.values(grouped).map(i => i.color)
  };
});
</script>

<template>
  <div class="dashboard-page">
    <header>
      <div class="header-left">
        <h1>Orbit Dashboard</h1>
        <div class="health-badge" :class="dashStore.health">
          {{ dashStore.health === 'HEALTHY' ? 'Saudável' : 'Atenção' }}
        </div>
      </div>
      
      <MonthSelector v-model="currentDate" />
    </header>

    <div class="summary-cards">
      <div class="card income">
        <span>Entradas</span>
        <h3>{{ formatMoney(dashStore.summary.projected.income) }}</h3>
      </div>

      <div class="card expense">
        <span>Saídas</span>
        <h3>{{ formatMoney(dashStore.summary.projected.expense) }}</h3>
      </div>

      <div class="card balance">
        <span>Saldo previsto</span>
        <h3>{{ formatMoney(dashStore.summary.endOfMonth.balance) }}</h3>
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-section main-chart">
        <h3>Fluxo Projetado (30 Dias)</h3>
        <BalanceChart v-if="dashStore.chartData.length" :data="dashStore.chartData" />
        <div v-else class="loading">Sem dados de projeção...</div>
      </div>

      <div class="chart-section donut-chart">
        <h3>Gastos por Categoria</h3>
        <ExpenseChart 
          :labels="expenseChartConfig.labels"
          :data="expenseChartConfig.data"
          :colors="expenseChartConfig.colors"
        />
      </div>
    </div>

    <div class="grid-layout">
      <div class="left-col">
        <TransactionForm @vue:updated="dashStore.fetchDashboard(currentDate)" />
        <RecurrenceManager />
      </div>
      <div class="right-col">
        <TransactionList />
        <CategoryManager />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard-page {
  padding: 2rem 3rem;
  background: #0f172a;
  min-height: 100vh;
  color: #e2e8f0;
}

header {
  display: flex;
  justify-content: space-between; /* Espalha título e seletor */
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 20px;

  .header-left {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  h1 { margin: 0; }
  
  .health-badge {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: bold;
    &.HEALTHY { background: #10b981; color: #022c22; }
    &.CRITICAL { background: #ef4444; color: #450a0a; }
  }
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 2rem;

  .card {
    background: #1e293b;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #334155;

    span { color: #94a3b8; font-size: 0.9rem; }
    h3 { font-size: 1.8rem; margin: 10px 0 0 0; }
    
    &.income h3 { color: #10b981; }
    &.expense h3 { color: #ef4444; }
  }
}

/* NOVO: Grid dos gráficos */
.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr; /* O gráfico de linha ocupa mais espaço (2/3) */
  gap: 20px;
  margin-bottom: 2rem;

  .chart-section {
    background: #1e293b;
    border-radius: 12px;
    padding: 1rem;
    border: 1px solid #334155;
    
    h3 { 
      margin: 0 0 15px 10px; 
      font-size: 1rem; 
      color: #94a3b8; 
    }
  }
}

.grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 1000px) {
  .grid-layout, .charts-grid, .summary-cards { grid-template-columns: 1fr; }
  header { flex-direction: column; align-items: flex-start; }
}
</style>