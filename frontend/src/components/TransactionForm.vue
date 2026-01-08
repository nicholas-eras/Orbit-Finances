<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCategoryStore } from '../stores/categories';
import { useTransactionStore } from '../stores/transactions';

const catStore = useCategoryStore();
const txStore = useTransactionStore();

// --- 1. FUNÇÕES AUXILIARES DE DATA ---

// Pega 'YYYY-MM-DD' local (para o input não mostrar "ontem" de noite)
const getTodayString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Gera a string ISO com o fuso explícito (Ex: ...T00:00:00-03:00)
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
const amount = ref<number | null>(null);
const description = ref('');
const date = ref(getTodayString()); // Inicia correto
const selectedCategory = ref('');
const type = ref<'EXPENSE' | 'INCOME'>('EXPENSE');

// Garante que as categorias carreguem se der F5 nessa tela
onMounted(() => {
  catStore.fetchCategories();
});

async function handleSubmit() {
  if (!amount.value || !description.value) return;

  // --- 2. LÓGICA DE ENVIO SEGURA ---
  const [year, month, day] = date.value.split('-').map(Number);
  
  // Cria data MEIA-NOITE LOCAL (00:00 do seu relógio)
  const localDate = new Date(year!, month! - 1, day, 0, 0, 0);

  // Gera a string com o fuso (ex: -03:00)
  const payloadDate = toLocalIsoString(localDate);

  await txStore.addTransaction({
    amount: amount.value,
    description: description.value,
    date: payloadDate, // Envia com o fuso certo
    categoryId: selectedCategory.value || null,
    type: type.value
  });

  // Limpa campos e reseta data para hoje
  amount.value = null;
  description.value = '';
  date.value = getTodayString();
  selectedCategory.value = '';
}
</script>

<template>
  <div class="tx-form">
    <h3>Nova Transação</h3>
    
    <div class="type-toggle">
      <button 
        :class="{ active: type === 'EXPENSE' }" 
        @click="type = 'EXPENSE'"
        class="btn-expense"
      >
        Gasto
      </button>
      <button 
        :class="{ active: type === 'INCOME' }" 
        @click="type = 'INCOME'"
        class="btn-income"
      >
        Entrada
      </button>
    </div>

    <div class="inputs">
      <input type="date" v-model="date" />
      
      <input 
        type="number" 
        v-model="amount" 
        placeholder="Valor (0.00)" 
        step="0.01"
      />
      
      <input 
        type="text" 
        v-model="description" 
        placeholder="Descrição (ex: Almoço)"
      />
      
      <select v-model="selectedCategory" :class="{ 'placeholder': !selectedCategory }">
        <option value="" disabled>Selecione a Categoria</option>
        <option value="">Sem Categoria</option>
        <option v-for="c in catStore.list" :value="c.id" :key="c.id">
          {{ c.name }}
        </option>
      </select>

      <button @click="handleSubmit" class="btn-save">Salvar</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.tx-form {
  background: #1e293b;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #334155;
  margin-bottom: 20px;
}

.type-toggle {
  display: flex;
  margin-bottom: 1rem;
  gap: 10px;

  button {
    flex: 1;
    padding: 8px;
    border: 1px solid #334155;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    border-radius: 6px;
    font-weight: bold;

    &.active.btn-expense { background: #ef4444; color: white; border-color: #ef4444; }
    &.active.btn-income { background: #10b981; color: white; border-color: #10b981; }
  }
}

.inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;

  input, select {
    padding: 10px;
    background: #0f172a;
    border: 1px solid #334155;
    color: white;
    border-radius: 6px;

    &.placeholder { color: #94a3b8; }
  }

  .btn-save {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 12px;
    border-radius: 6px;
    font-weight: bold;
    cursor: pointer;
    margin-top: 5px;
    
    &:hover { background: #2563eb; }
  }
}
</style>