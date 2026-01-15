// services/categoriesApi.js
import { api } from './api'; // seu helper já existente

// Função para criar uma categoria
export async function createCategory({ name, color, icon=null }) {
  if (!name || !color) throw new Error('Nome e cor são obrigatórios');
  
  return api('/categories', {
    method: 'POST',
    body: { name, color, icon },
  });
}

// Função para listar todas as categorias do usuário
export async function getCategories() {
  return api('/categories', {
    method: 'GET',
  });
}

export async function deleteCategory(id) {
  return api(`/categories/${id}`, { method: 'DELETE' });
}

export async function updateCategory(id, { name, color, icon }) {
  return api(`/categories/${id}`, {
    method: 'PATCH',
    body: { name, color, icon },
  });
}
