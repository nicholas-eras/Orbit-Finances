<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  data: { x: string; y: number }[]
}>();

// Configuração do Gráfico (ApexCharts Options)
const chartOptions = computed(() => ({
  chart: {
    type: 'area', // Gráfico de Área preenchida
    height: 350,
    toolbar: { show: false },
    background: 'transparent'
  },
  colors: ['#3b82f6'], // Azul Orbit
  stroke: { curve: 'smooth', width: 2 },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.7,
      opacityTo: 0.1,
      stops: [0, 90, 100]
    }
  },
  dataLabels: { enabled: false },
  xaxis: {
    type: 'datetime',
    tooltip: { enabled: false },
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#94a3b8' } }
  },
  yaxis: {
    labels: { 
      style: { colors: '#94a3b8' },
      formatter: (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      }
    }
  },
  grid: {
    borderColor: '#334155',
    strokeDashArray: 4,
  },
  theme: { mode: 'dark' },
  annotations: {
    xaxis: [{
        x: new Date().toISOString().split('T')[0],
        strokeDashArray: 4,
        borderColor: '#facc15',
        label: {
        text: 'Hoje',
        style: {
            color: '#0f172a',
            background: '#facc15'
        }
        }
    }]
    }
}));

const series = computed(() => [{
  name: 'Saldo Projetado',
  data: props.data
}]);
</script>

<template>
  <div class="chart-container">
    <apexchart 
      type="area" 
      height="300" 
      :options="chartOptions" 
      :series="series"
    ></apexchart>
  </div>
</template>

<style scoped>
.chart-container {
  width: 100%;
  padding: 10px;
}
</style>