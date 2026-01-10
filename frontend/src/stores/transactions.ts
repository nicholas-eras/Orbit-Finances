import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api';
import type { Category } from './categories';

export interface Transaction {
  id: string;
  amount: string;
  description: string;
  date: string;
  type: 'EXPENSE' | 'INCOME';
  category?: Category;
}

export const useTransactionStore = defineStore('transactions', () => {
  const list = ref<Transaction[]>([]);

  // ATUALIZADO: Aceita 'date' opcional
  async function fetchTransactions(dateFilter?: Date) {
    const targetDate = dateFilter || new Date();
    
    // Extrai mês (1-12) e ano
    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();

    // Envia: GET /transactions?month=1&year=2026
    const res = await api.get('/transactions', {
      params: { month, year }
    });
    
    list.value = res.data;
  }

  async function addTransaction(payload: any) {
    const res = await api.post('/transactions', payload);
    // Adiciona ao topo e ordena novamente ou apenas recarrega
    // Como estamos vendo um mês específico, o ideal é dar unshift 
    // APENAS se a data da nova transação for no mês atual. 
    // Para simplificar, vamos apenas dar unshift:
    list.value.unshift(res.data);
  }

  return { list, fetchTransactions, addTransaction };
});