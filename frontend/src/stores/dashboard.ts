import { defineStore } from 'pinia';
import { ref, reactive } from 'vue'; // Importe reactive
import api from '../api';

interface DashboardSummary {
  realized: { income: number; expense: number; balance: number };
  projected: { income: number; expense: number; balance: number };
  endOfMonth: { balance: number };
}

export const useDashboardStore = defineStore('dashboard', () => {
  const summary = reactive<DashboardSummary>({ // Use reactive para objetos profundos
    realized: { income: 0, expense: 0, balance: 0 },
    projected: { income: 0, expense: 0, balance: 0 },
    endOfMonth: { balance: 0 }
  });

  const chartData = ref<{ x: string; y: number }[]>([]);
  const health = ref<'HEALTHY' | 'WARNING' | 'CRITICAL'>('HEALTHY');

  // CORREÇÃO: Aceita a data para filtrar
  async function fetchDashboard(dateFilter?: Date) {
    const targetDate = dateFilter || new Date();
    const month = targetDate.getMonth() + 1;
    const year = targetDate.getFullYear();

    try {
      // CORREÇÃO: Rota '/dashboard' e envio dos parametros
      const { data } = await api.get('/analytics/dashboard', {
        params: { month, year }
      });

      // Atualiza os estados
      // Nota: Como 'summary' é reactive, usamos Object.assign ou atualizamos prop a prop
      Object.assign(summary, data.summary);
      
      chartData.value = data.chartData;
      health.value = data.health;
    } catch (error) {
      console.error("Erro ao buscar dashboard:", error);
    }
  }

  return { summary, chartData, health, fetchDashboard };
});