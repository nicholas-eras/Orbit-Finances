<script setup lang="ts">
import { onMounted } from 'vue';
import { useDashboardStore } from '../stores/dashboard';
import CategoryManager from '../components/CategoryManager.vue';
import TransactionForm from '../components/TransactionForm.vue';
import TransactionList from '../components/TransactionList.vue';
import RecurrenceManager from '../components/RecurrenceManager.vue';
import BalanceChart from '../components/BalanceChart.vue';

const dashStore = useDashboardStore();

onMounted(() => {
  dashStore.fetchDashboard();
});

const formatMoney = (val: number) => 
  val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
</script>

<template>
  <div class="dashboard-page">
    <header>
      <h1>Orbit Dashboard</h1>
      <div class="health-badge" :class="dashStore.health">
        {{ dashStore.health === 'HEALTHY' ? 'Saudável' : 'Atenção' }}
      </div>
    </header>

    <div class="summary-cards">
      <div class="card income">
        <span>Entradas (mês)</span>
        <h3>{{ formatMoney(dashStore.summary.projected.income) }}</h3>
      </div>

      <div class="card expense">
        <span>Saídas (mês)</span>
        <h3>{{ formatMoney(dashStore.summary.projected.expense) }}</h3>
      </div>

      <div class="card balance">
        <span>Saldo previsto (fim do mês)</span>
        <h3>{{ formatMoney(dashStore.summary.endOfMonth.balance) }}</h3>
      </div>
    </div>

    <div class="summary-cards secondary">
      <div class="card">
        <span>Saldo atual</span>
        <h3>{{ formatMoney(dashStore.summary.realized.balance) }}</h3>
      </div>
    </div>

    <div class="chart-section">
      <h3>Fluxo Projetado (30 Dias)</h3>
      <BalanceChart v-if="dashStore.chartData.length" :data="dashStore.chartData" />
      <div v-else class="loading">Carregando projeções...</div>
    </div>

    <div class="grid-layout">
      <div class="left-col">
        <TransactionForm @vue:updated="dashStore.fetchDashboard()" />
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
  padding: 3rem;
  background: #0f172a;
  min-height: 100vh;
  color: #e2e8f0;
}

header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 2rem;

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

.chart-section {
  background: #1e293b;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 2rem;
  border: 1px solid #334155;
}

.grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 1000px) {
  .grid-layout { grid-template-columns: 1fr; }
  .summary-cards { grid-template-columns: 1fr; }
}
</style>