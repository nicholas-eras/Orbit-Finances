<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRecurrenceStore } from '../stores/recurrences';
// 1. Importar a store de categorias
import { useCategoryStore } from '../stores/categories';

const store = useRecurrenceStore();
const categoryStore = useCategoryStore(); // 2. Instanciar

// --- FUNÇÕES AUXILIARES ---
const getTodayString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- STATE ---
const description = ref('');
const amount = ref<number | null>(null);
const frequency = ref('MONTHLY');
const startDate = ref(getTodayString());
const selectedCategoryId = ref(''); // 3. Estado para a categoria selecionada

onMounted(async () => {
  store.fetchRecurrences();
  // 4. Buscar categorias ao carregar a tela
  await categoryStore.fetchCategories();
});

// --- FUNÇÃO PARA GERAR O ISO COM OFFSET (ex: -03:00) ---
const toLocalIsoString = (date: Date) => {
  const tzo = -date.getTimezoneOffset(); // O JS inverte o sinal (Brasil retorna 180), então invertemos de volta
  const dif = tzo >= 0 ? '+' : '-';
  
  const pad = (num: number) => String(num).padStart(2, '0');

  return date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    dif + pad(Math.floor(Math.abs(tzo) / 60)) + // Horas do fuso
    ':' + pad(Math.abs(tzo) % 60);              // Minutos do fuso
};

// --- SEU HANDLESAVE ATUALIZADO ---
async function handleSave() {
  if (!amount.value || !description.value || !startDate.value) return;

  const [year, month, day] = startDate.value.split('-').map(Number);

  // 1. Cria a data Local (ex: 00:00 do Brasil)
  const localDate = new Date(year!, month! - 1, day, 0, 0, 0);

  // 2. Gera a string com o fuso explícito
  // Resultado: "2026-01-07T00:00:00-03:00"
  const payloadDate = toLocalIsoString(localDate);

  console.log('Enviando:', payloadDate); // Pode olhar no console, vai estar perfeito

  await store.addRecurrence({
    description: description.value,
    amount: amount.value,
    frequency: frequency.value,
    interval: 1,
    startDate: payloadDate, // <--- AQUI VAI COM O -03:00
    type: 'EXPENSE',
    categoryId: selectedCategoryId.value || undefined
  });

  // Reset
  description.value = '';
  amount.value = null;
  startDate.value = getTodayString();
  selectedCategoryId.value = '';
}

const formatCurrency = (val: string | number) => {
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};
</script>

<template>
  <div class="recurrence-box">
    <h3>Contas Fixas & Assinaturas</h3>
    
    <div class="rec-list">
      <div v-for="rec in store.list" :key="rec.id" class="rec-item">
        <div class="rec-info">
          <strong>{{ rec.description }}</strong>
          <small>{{ rec.frequency }}</small>
        </div>
        <div class="rec-amount">{{ formatCurrency(rec.originalAmount) }}</div>
      </div>
      
      <div v-if="store.list.length === 0" class="empty">
        Sem contas fixas cadastradas.
      </div>
    </div>

    <div class="add-form">
      <h4>Nova Recorrência</h4>
      <div class="inputs">
        <input type="text" v-model="description" placeholder="Ex: Netflix" />
        
        <select v-model="selectedCategoryId" :class="{ 'placeholder': !selectedCategoryId }">
          <option value="" disabled>Selecione a Categoria</option>
          <option 
            v-for="cat in categoryStore.list" 
            :key="cat.id" 
            :value="cat.id"
          >
            {{ cat.name }}
          </option>
        </select>

        <input type="number" v-model="amount" placeholder="Valor" />
        
        <select v-model="frequency">
          <option value="WEEKLY">Semanal</option>
          <option value="MONTHLY">Mensal</option>
          <option value="YEARLY">Anual</option>
        </select>
        
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
</style>