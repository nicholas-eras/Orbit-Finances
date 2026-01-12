'use client';

import { useState, useEffect, useMemo } from "react";
// IMPORTANTE: Importar o arquivo de estilos
import styles from './Dashboard.module.scss'; 

import CategoryManager from "../../components/category/CategoryManager";
import BalanceAreaChart from "../../components/charts/BalanceAreaChart";
import DoughnutChart from "../../components/charts/DoughnutChart";
import RecurrenceBox from "../../components/charts/RecurrenceBox"; // Se atente ao caminho desse aqui
import TransactionList from "../../components/charts/TransactionList";
import MonthSelector from "../../components/filters/MonthSelector";
import TransactionForm from "../../components/forms/TransactionForm";
import { getTransactions, getBarChartData, getExpensesByCategory } from "../../api/transactions";

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({
    projected: { income: 0, expense: 0 },
    endOfMonth: { balance: 0 }
  });
  const [health, setHealth] = useState('HEALTHY');
  const [loading, setLoading] = useState(true);

  async function fetchDashboard(date) {
    try {
      setLoading(true);
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const dto = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      };

      const [txList, barChart, expensesByCat] = await Promise.all([
        getTransactions(date.getMonth() + 1, date.getFullYear()),
        getBarChartData(dto),
        getExpensesByCategory(dto)
      ]);

      setTransactions(txList);
      setChartData(barChart);

      const totalIncome = expensesByCat.reduce((acc, e) => acc + e.income, 0);
      const totalExpense = expensesByCat.reduce((acc, e) => acc + e.expense, 0);
      const balance = totalIncome - totalExpense;

      setSummary({
        projected: { income: totalIncome, expense: totalExpense },
        endOfMonth: { balance }
      });

      if (balance < 0) setHealth('CRITICAL');
      else if (balance < totalIncome * 0.2) setHealth('WARNING');
      else setHealth('HEALTHY');

    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard(currentDate);
  }, [currentDate]);

  const expenseChartConfig = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'EXPENSE' || Number(t.amount) < 0);
    const grouped = {};

    expenses.forEach(tx => {
      const catName = tx.category?.name || 'Sem Categoria';
      const catColor = tx.category?.color || '#94a3b8';
      const val = Math.abs(Number(tx.amount));

      if (!grouped[catName]) grouped[catName] = { amount: 0, color: catColor };
      grouped[catName].amount += val;
    });

    return {
      labels: Object.keys(grouped),
      data: Object.values(grouped).map(i => i.amount),
      colors: Object.values(grouped).map(i => i.color)
    };
  }, [transactions]);

  const formatMoney = (val) =>
    Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleTransactionUpdate = () => {
    fetchDashboard(currentDate);
  };

  if (loading) return <p>Carregando dashboard...</p>;

  return (
    // ERRO ANTERIOR: className="dashboard-page"
    // CORREÇÃO: className={styles.dashboardPage}
    <div className={styles.dashboardPage}>
      <header>
        <div className={styles.headerLeft}>
          <h1>Orbit Dashboard</h1>
          {/* Note como usamos [] para classes dinâmicas ou concatenamos string */}
          <div className={`${styles.healthBadge} ${styles[health]}`}>
            {health === 'HEALTHY' ? 'Saudável' : health === 'WARNING' ? 'Atenção' : 'Crítico'}
          </div>
        </div>
        <MonthSelector value={currentDate} onChange={setCurrentDate} />
      </header>

      {/* Resumo */}
      <div className={styles.summaryCards}>
        <div className={`${styles.card} ${styles.income}`}>
          <span>Entradas</span>
          <h3>{formatMoney(summary.projected.income)}</h3>
        </div>
        <div className={`${styles.card} ${styles.expense}`}>
          <span>Saídas</span>
          <h3>{formatMoney(summary.projected.expense)}</h3>
        </div>
        <div className={`${styles.card} ${styles.balance}`}>
          <span>Saldo previsto</span>
          <h3 className={summary.endOfMonth.balance < 0 ? styles.textRed : ''}>
            {formatMoney(summary.endOfMonth.balance)}
          </h3>
        </div>
      </div>

      {/* Gráficos */}
      <div className={styles.chartsGrid}>
        <div className={`${styles.chartSection} ${styles.mainChart}`}>
          <h3>Fluxo Projetado (30 Dias)</h3>
          {chartData.length > 0 ? <BalanceAreaChart data={chartData} /> : <div className={styles.loading}>Carregando projeção...</div>}
        </div>

        <div className={`${styles.chartSection} ${styles.donutChart}`}>
          <h3>Gastos por Categoria</h3>
          {expenseChartConfig.data.length > 0 ? (
            <DoughnutChart
              labels={expenseChartConfig.labels}
              data={expenseChartConfig.data}
              colors={expenseChartConfig.colors}
            />
          ) : (
            <div className={styles.noData}>Sem gastos no período</div>
          )}
        </div>
      </div>

      {/* Inferior */}
      <div className={styles.gridLayout}>
        <div className={styles.leftCol}>
          <TransactionForm onUpdated={handleTransactionUpdate} />
          <RecurrenceBox />
        </div>
        <div className={styles.rightCol}>
          <TransactionList month={undefined} year={undefined} />
          <CategoryManager />
        </div>
      </div>
    </div>
  );
}