<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  data: { x: string; y: number }[]
}>();

/* ---------------------------
   NICE NUMBERS (eixo Y)
---------------------------- */
const getSmartMax = (val: number) => {
  if (val === 0) return 100;

  const target = Math.abs(val) * 1.05;
  const magnitude = Math.pow(10, Math.floor(Math.log10(target)));
  const normalized = target / magnitude;

  let scalar;
  if (normalized <= 1) scalar = 1;
  else if (normalized <= 1.25) scalar = 1.25;
  else if (normalized <= 1.5) scalar = 1.5;
  else if (normalized <= 2) scalar = 2;
  else if (normalized <= 2.5) scalar = 2.5;
  else if (normalized <= 5) scalar = 5;
  else scalar = 10;

  return scalar * magnitude;
};

/* ------------------------------------
   THRESHOLD DINÂMICO
------------------------------------- */
const getDynamicThreshold = () => {
  if (!props.data.length) return 0;

  const maxAbs = Math.max(
    ...props.data.map(d => Math.abs(d.y))
  );

  return maxAbs * 0.15; // 15% do maior impacto
};

/* ------------------------------------
   PONTOS RELEVANTES (ANTI-POLUIÇÃO)
------------------------------------- */
const getRelevantPoints = (maxPoints = 4) => {
  const threshold = getDynamicThreshold();
  const events: any[] = [];

  for (let i = 1; i < props.data.length; i++) {
    const prev = props.data[i - 1]!.y;
    const curr = props.data[i]!.y;
    const impact = Math.abs(curr - prev);

    if (impact >= threshold) {
      events.push({
        x: props.data[i]!.x,
        y: curr,
        impact
      });
    }
  }

  // ordena por impacto
  events.sort((a, b) => b.impact - a.impact);

  // pega só os mais relevantes
  let selected = events.slice(0, maxPoints);

  // garante início e fim
  if (props.data.length) {
    selected.unshift(props.data[0]);
    selected.push(props.data[props.data.length - 1]);
  }

  // remove duplicados
  const unique = Array.from(
    new Map(selected.map(p => [p.x, p])).values()
  );

  return unique;
};

/* ---------------------------
   CHART OPTIONS
---------------------------- */
const chartOptions = computed(() => {
  const values = props.data.map(d => d.y);
  const maxAbsValue = values.length
    ? Math.max(...values.map(v => Math.abs(v)))
    : 0;

  const limit = getSmartMax(maxAbsValue);
  const points = getRelevantPoints(4);
const yMin = -limit * 1.1;
const yMax = limit * 1.1;
const totalPoints = props.data.length;

  return {
    chart: {
      type: 'area',
      height: 350,
      toolbar: { show: false },
      background: 'transparent',
      fontFamily: 'inherit'
    },
    colors: ['#3b82f6'],
    stroke: {
      curve: 'smooth',
      width: 2
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.6,
        opacityTo: 0.05,
        stops: [0, 90, 100]
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'datetime',
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#94a3b8' } },
      tooltip: { enabled: false }
    },
    yaxis: {
      min: -limit * 1.1,
      max: limit * 1.1,
      tickAmount: 4,
      labels: {
        style: { colors: '#94a3b8' },
        formatter: (value: number) =>
          value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
          })
      }
    },
    grid: {
      borderColor: '#334155',
      strokeDashArray: 4,
      yaxis: { lines: { show: true } }
    },
    theme: { mode: 'dark' },
    annotations: {
      yaxis: [
        {
          y: 0,
          borderColor: '#475569'
        }
      ],
points: points.map((point, index) => {
  const isFirst = index === 0;
  const isLast = index === points.length - 1;

  // proteção horizontal (X)
  let offsetX = 0;

  if (isLast) offsetX = -40;   // puxa para dentro do gráfico
  if (isFirst) offsetX = 40;   // empurra para dentro

  return {
    x: new Date(point.x).getTime(),
    y: point.y,
    marker: {
      size: isLast ? 7 : 6,
      fillColor: point.y >= 0 ? '#10b981' : '#ef4444',
      strokeColor: '#fff',
      strokeWidth: 2
    },
    label: {
      show: isFirst || isLast,
      text: point.y.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0
      }),
      offsetX,
      offsetY: point.y >= 0 ? -18 : 18,
      style: {
        background: point.y >= 0 ? '#10b981' : '#ef4444',
        color: '#fff',
        fontSize: '11px',
        fontWeight: 700,
        padding: {
          left: 6,
          right: 6,
          top: 2,
          bottom: 2
        }
      }
    }
  };
})


    }
  };
});

/* ---------------------------
   SERIES
---------------------------- */
const series = computed(() => [
  {
    name: 'Saldo Projetado',
    data: props.data
  }
]);
</script>

<template>
  <div class="chart-container">
    <apexchart
      type="area"
      height="300"
      :options="chartOptions"
      :series="series"
    />
  </div>
</template>

<style scoped>
.chart-container {
  width: 100%;
  padding: 10px 0;
}
</style>
