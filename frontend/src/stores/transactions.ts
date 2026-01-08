import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api';
import type { Category } from './categories';

export interface Transaction {
  id: string;
  amount: string; // vem como string do JSON decimal
  description: string;
  date: string;
  type: 'EXPENSE' | 'INCOME';
  category?: Category;
}

export const useTransactionStore = defineStore('transactions', () => {
  const list = ref<Transaction[]>([]);

  async function fetchTransactions() {
    const res = await api.get('/transactions');
    list.value = res.data;
  }

  async function addTransaction(payload: any) {
    const res = await api.post('/transactions', payload);
    // adiciona no topo da lista
    list.value.unshift(res.data);
  }

  return { list, fetchTransactions, addTransaction };
});