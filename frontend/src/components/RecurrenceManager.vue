<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRecurrenceStore } from '../stores/recurrences';
import { useCategoryStore } from '../stores/categories';

const store = useRecurrenceStore();
const categoryStore = useCategoryStore();

// --- FUNÇÕES AUXILIARES (Mantendo a lógica de fuso correta) ---
const getTodayString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toLocalIsoString = (date: Date) => {
  const tzo = -date.getTimezoneOffset();
  const dif = tzo >= 0 ? '+' : '-';
  const pad = (num: number) => String(num).padStart(2, '0');
  return date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    dif + pad(Math.floor(Math.abs(tzo) / 60)) +
    ':' + pad(Math.abs(tzo) % 60);
};

// --- STATE ---
const description = ref('');
const amount = ref<number | null>(null);
const startDate = ref(getTodayString());
const selectedCategoryId = ref('');

// NOVOS CAMPOS PARA FLEXIBILIDADE
const interval = ref(1); // Padrão: 1
const frequency = ref('MONTHLY'); // Padrão: Mês

onMounted(async () => {
  store.fetchRecurrences();
  await categoryStore.fetchCategories();
});

async function handleSave() {
  if (!amount.value || !description.value || !startDate.value) return;

  // Lógica de Data Segura
  const [year, month, day] = startDate.value.split('-').map(Number);
  const localDate = new Date(year!, month! - 1, day, 0, 0, 0);
  const payloadDate = toLocalIsoString(localDate);

  await store.addRecurrence({
    description: description.value,
    amount: amount.value,
    
    // AGORA ENVIAMOS A DUPLA DINÂMICA:
    frequency: frequency.value,
    interval: interval.value, // Ex: 6 (para semestral)
    
    startDate: payloadDate,
    type: 'EXPENSE',
    categoryId: selectedCategoryId.value || undefined
  });

  // Reset
  description.value = '';
  amount.value = null;
  startDate.value = getTodayString();
  selectedCategoryId.value = '';
  interval.value = 1; // Reseta para 1
}

const formatCurrency = (val: string | number) => {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Função para deixar o texto da lista bonito (Ex: "A cada 6 Meses")
const formatFrequency = (freq: string, int: number) => {
  const map: Record<string, string> = {
    'DAILY': 'Dia(s)',   // <--- ADICIONE ISTO
    'WEEKLY': 'Semana(s)',
    'MONTHLY': 'Mês(es)',
    'YEARLY': 'Ano(s)'
  };
  const unit = map[freq] || freq;
  
  if (int === 1) return unit.replace('(s)', '').replace('(es)', '');
  return `A cada ${int} ${unit}`;
};

</script>

<template>
  <div class="recurrence-box">
    <h3>Contas Fixas & Assinaturas</h3>
    
    <div class="rec-list">
      <div v-for="rec in store.list" :key="rec.id" class="rec-item">
        <div class="rec-info">
          <strong>{{ rec.description }}</strong>
          <small>{{ formatFrequency(rec.frequency, rec.interval) }}</small>
        </div>
        <div class="rec-amount">{{ formatCurrency(rec.originalAmount) }}</div>
      </div>
    </div>

    <div class="add-form">
      <h4>Nova Recorrência</h4>
      <div class="inputs">
        <input type="text" v-model="description" placeholder="Ex: Seguro Carro" />
        
        <select v-model="selectedCategoryId" :class="{ 'placeholder': !selectedCategoryId }">
          <option value="" disabled>Categoria</option>
          <option v-for="c in categoryStore.list" :value="c.id" :key="c.id">{{ c.name }}</option>
        </select>

        <input type="number" v-model="amount" placeholder="Valor" />
        
        <div class="frequency-control">
          <span>A cada</span>
          <input type="number" v-model="interval" min="1" class="interval-input"/>
          <select v-model="frequency">
            <option value="DAILY">Dia(s)</option>
            <option value="WEEKLY">Semana(s)</option>
            <option value="MONTHLY">Mês(es)</option>
            <option value="YEARLY">Ano(s)</option>
          </select>
        </div>

        <input type="date" v-model="startDate" />
        
        <button @click="handleSave">Adicionar</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.recurrence-box {
  background: #1e293b;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #334155;
  margin-top: 20px;
}

.rec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #334155;
  
  .rec-info {
    display: flex;
    flex-direction: column;
    small { color: #94a3b8; font-size: 0.75rem; }
  }
  
  .rec-amount { color: #cbd5e1; font-weight: 600; }
}

.add-form {
  margin-top: 1.5rem;
  background: #0f172a;
  padding: 1rem;
  border-radius: 8px;

  h4 { margin-top: 0; font-size: 0.9rem; color: #94a3b8; }

  .inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    
    input, select, button {
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #334155;
      background: #1e293b;
      color: white;
      
      // Estilo para quando o select está no placeholder
      &.placeholder {
        color: #94a3b8;
      }
    }

    button {
      grid-column: span 2;
      background: #8b5cf6; // Roxo
      border-color: #8b5cf6;
      font-weight: bold;
      cursor: pointer;
      &:hover { background: #7c3aed; }
    }
  }
}

.empty {
  color: #64748b;
  text-align: center;
  padding: 20px;
  font-size: 0.9rem;
}

.frequency-control {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #1e293b;
  
  span { font-size: 0.8rem; color: #94a3b8; white-space: nowrap; }
  
  .interval-input {
    width: 50px !important;
    text-align: center;
  }
  
  select {
    flex: 1;
  }
}
</style>