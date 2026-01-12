'use client';

import { useEffect, useState } from 'react';
import { getBarChartData, getExpensesByCategory } from '../../api/transactions';

export default function Dashboard() {
  const [summary, setSummary] = useState({ realized: { balance: 0 } });
  const [chartData, setChartData] = useState(null);
  const [health, setHealth] = useState('');
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(new Date());

  // ========================================
  // Função para buscar dados do dashboard
  // ========================================
  async function fetchDashboard(currentDate) {
    try {
      setLoading(true);

      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const dto = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      // --- Dados do gráfico ---
      const chart = await getBarChartData(dto);
      setChartData(chart);

      // --- Resumo de despesas por categoria ---
      const expenses = await getExpensesByCategory(dto);

      const totalExpenses = expenses.reduce((acc, e) => acc + e.expense, 0);
      const totalIncome = expenses.reduce((acc, e) => acc + e.income, 0);

      setSummary({
        realized: {
          balance: totalIncome - totalExpenses,
        },
      });

      // --- Health simples (ex: saldo positivo/negativo) ---
      setHealth(totalIncome - totalExpenses >= 0 ? 'Saudável' : 'Atenção');

    } catch (err) {
      console.error('Erro ao buscar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard(date);
  }, [date]);

  if (loading) return <p>Carregando...</p>;

  return (
    <div>
      <h2>Resumo</h2>

      <p>Saldo: {summary.realized.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
      <p>Status: {health}</p>

      {/* chartData vai para seu gráfico */}
      {chartData && (
        <pre>{JSON.stringify(chartData, null, 2)}</pre>
      )}
    </div>
  );
}
