<script setup lang="ts">
import { onMounted } from 'vue';
import { useTransactionStore } from '../stores/transactions';

const store = useTransactionStore();

onMounted(() => {
  store.fetchTransactions();
});

const formatCurrency = (val: string | number) => {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// --- CORREÇÃO AQUI ---
// Estratégia "String Pura":
// O banco manda: "2026-01-07T00:00:00.000Z"
// A gente corta a string e monta a data, ignorando qualquer fuso horário do navegador.
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  
  // 1. Pega só a parte da data: "2026-01-07"
  const isoDate = dateStr.toString().split('T')[0];
  
  // 2. Quebra em pedaços: ["2026", "01", "07"]
  const [year, month, day] = isoDate!.split('-');

  // 3. Monta no padrão BR: "07/01"
  return `${day}/${month}`;
};
</script>

<template>
  <div class="tx-list">
    <h3>Últimas Movimentações</h3>
    
    <div v-if="store.list.length === 0" class="empty">
      Nada por aqui ainda.
    </div>

    <div v-for="tx in store.list" :key="tx.id" class="tx-item">
      <div class="tx-date">{{ formatDate(tx.date) }}</div>
      
      <div class="tx-info">
        <div class="tx-desc">{{ tx.description }}</div>
        <div 
          class="tx-cat" 
          v-if="tx.category"
          :style="{ color: tx.category.color }"
        >
          {{ tx.category.name }}
        </div>
      </div>

      <div 
        class="tx-amount"
        :class="{ 'is-expense': Number(tx.amount) < 0, 'is-income': Number(tx.amount) > 0 }"
      >
        {{ formatCurrency(tx.amount) }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tx-list {
  background: #1e293b;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #334155;
  margin-bottom: 20px;
}

.tx-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #334155;

  &:last-child { border-bottom: none; }
}

.tx-date {
  color: #64748b;
  font-size: 0.85rem;
  width: 50px;
}

.tx-info {
  flex: 1;
  padding: 0 10px;
  
  .tx-desc { font-weight: 500; color: #e2e8f0; }
  .tx-cat { font-size: 0.75rem; margin-top: 2px; }
}

.tx-amount {
  font-weight: 600;
  &.is-expense { color: #ef4444; }
  &.is-income { color: #10b981; }
}

.empty { color: #64748b; text-align: center; padding: 20px; }
</style>