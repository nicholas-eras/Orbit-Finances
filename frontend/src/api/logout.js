// services/authApi.js
import { api } from './api';

/**
 * Faz logout chamando o backend e redirecionando para home
 */
export async function logout() {
  await api('/auth/logout', { method: 'GET' });
  window.location.href = '/';
}
