import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  email: string;
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('orbit_token'));
  const user = ref<User | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  function hydrate() {
    if (!token.value) return;

    try {
      const decoded: any = jwtDecode(token.value);
      user.value = { id: decoded.sub, email: decoded.email };
    } catch (e) {
      logout();
    }
  }

  function setToken(newToken: string) {
    token.value = newToken;
    localStorage.setItem('orbit_token', newToken);
    hydrate();
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('orbit_token');
  }

  hydrate();

  return { token, user, isAuthenticated, setToken, logout };
});
