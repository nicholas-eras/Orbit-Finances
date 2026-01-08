import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api';

export interface Recurrence {
  id: string;
  description: string;
  frequency: string;
  interval: number;
  originalAmount: string;
}

export const useRecurrenceStore = defineStore('recurrences', () => {
  const list = ref<Recurrence[]>([]);

  async function fetchRecurrences() {
    const res = await api.get('/recurrences');
    list.value = res.data;
  }

  async function addRecurrence(payload: any) {
    const res = await api.post('/recurrences', payload);
    list.value.push(res.data);
  }

  return { list, fetchRecurrences, addRecurrence };
});