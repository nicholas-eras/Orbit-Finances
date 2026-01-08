import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export const useCategoryStore = defineStore('categories', () => {
  const list = ref<Category[]>([]);

  async function fetchCategories() {
    const res = await api.get('/categories');
    list.value = res.data;
  }

  async function addCategory(category: { name: string; color: string }) {
    const res = await api.post('/categories', category);
    list.value.push(res.data);
  }

  return { list, fetchCategories, addCategory };
});