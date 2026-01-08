import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../api';

interface DashboardSummary {
  realized: {
    income: number;
    expense: number;
    balance: number;
  };
  projected: {
    income: number;
    expense: number;
    balance: number;
  };
  endOfMonth: {
    balance: number;
  };
}

export const useDashboardStore = defineStore('dashboard', () => {
  const summary = ref<DashboardSummary>({
    realized: { income: 0, expense: 0, balance: 0 },
    projected: { income: 0, expense: 0, balance: 0 },
    endOfMonth: { balance: 0 }
  });

  const chartData = ref<{ x: string; y: number }[]>([]);
  const health = ref<'HEALTHY' | 'WARNING' | 'CRITICAL'>('HEALTHY');

  async function fetchDashboard() {
    const { data } = await api.get('/analytics/dashboard');

    summary.value = data.summary;
    chartData.value = data.chartData;
    health.value = data.health;
  }

  return { summary, chartData, health, fetchDashboard };
});
