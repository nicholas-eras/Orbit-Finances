<script setup lang="ts">
import { computed } from 'vue';
// import { Doughnut } from 'vue-chartjs';
// import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Registra os componentes necessários do Chart.js
// ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps<{
  labels: string[];
  data: number[];
  colors: string[];
}>();

const chartData = computed(() => ({
  labels: props.labels,
  datasets: [
    {
      backgroundColor: props.colors,
      data: props.data,
      borderWidth: 0 // Remove borda branca padrão
    }
  ]
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const, // Legenda ao lado
      labels: {
        color: '#cbd5e1', // Cor do texto (claro)
        font: { size: 12 }
      }
    }
  }
};
</script>

<template>
  <div class="chart-container">
    <!-- <Doughnut :data="chartData" :options="chartOptions" /> -->
    
    <div v-if="data.length === 0" class="no-data">
      Sem gastos neste período
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  position: relative;
  height: 250px; /* Altura fixa para não estourar */
  width: 100%;
}
.no-data {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 0.9rem;
  background: rgba(30, 41, 59, 0.8); /* Fundo semi-transparente */
}
</style>