<script setup lang="ts">
const apiUrl = import.meta.env.VITE_API_URL
</script>

<template>
  <div class="login-container">
    <div class="card">
      <h1>Orbit Finance</h1>
      <p>Assuma o controle do seu universo financeiro.</p>

      <a :href="`${apiUrl}/auth/google`" class="btn-google">
        Entrar com Google
      </a>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  color: white;

  .card {
    text-align: center;
    padding: 3rem;
    background: #1e293b;
    border-radius: 16px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);

    h1 { margin-bottom: 0.5rem; font-size: 2.5rem; }
    p { margin-bottom: 2rem; color: #94a3b8; }
  }

  .btn-google {
    display: inline-block;
    padding: 12px 24px;
    background: white;
    color: #333;
    text-decoration: none;
    border-radius: 8px;
    font-weight: bold;
    transition: transform 0.2s;

    &:hover { transform: scale(1.05); }
  }
}
</style>