<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

onMounted(() => {
  const token = route.query.token as string;
  
  if (token) {
    authStore.setToken(token);
    router.push('/');
  } else {
    router.push('/login');
  }
});
</script>

<template>
  <div style="color: white; padding: 20px;">Autenticando órbita...</div>
</template>