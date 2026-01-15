'use client';

import { useState, useEffect, useMemo } from "react";
import Link from 'next/link'; // <--- 1. Importe o Link
import styles from './Dashboard.module.scss'; 

// Componentes
import CategoryManager from "../../components/category/CategoryManager";
import BalanceAreaChart from "../../components/charts/BalanceAreaChart";
import DoughnutChart from "../../components/charts/DoughnutChart";
import RecurrenceBox from "../../components/charts/RecurrenceBox"; 
import TransactionList from "../../components/charts/TransactionList";
import MonthSelector from "../../components/filters/MonthSelector";
import TransactionForm from "../../components/forms/TransactionForm";

// APIs
import { getTransactions } from "../../api/transactions";
import { getCategories } from "../../api/categories";
import { getDashboardAnalytics } from "../../api/dashboard";

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Listas de dados
  const [transactions, setTransactions] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]); 

  // Dados para os Gráficos
  const [chartData, setChartData] = useState([]); 
  const [pieChartData, setPieChartData] = useState([]); 

  // Resumo Financeiro
  const [summary, setSummary] = useState({
    projected: { income: 0, expense: 0 },
    endOfMonth: { finalBalance: 0, monthResult: 0 }
  });

  const [bankBalance, setBankBalance] = useState(null);

  const [health, setHealth] = useState('HEALTHY');
  const [loading, setLoading] = useState(true);

  // Busca Categorias
  async function fetchCategoriesData() {
    try {
      const data = await getCategories();
      setCategoriesList(data);
    } catch (err) {
      console.error("Erro ao carregar categorias", err);
    }
  }

  // Busca Dados do Dashboard
  async function fetchDashboard(date) {
    try {
      setLoading(true);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const [analyticsData, txList] = await Promise.all([
        getDashboardAnalytics(month, year),
        getTransactions(month, year),
      ]);

      setSummary(analyticsData.summary);     
      setChartData(analyticsData.chartData); 
      setPieChartData(analyticsData.categories);
      setHealth(analyticsData.health);       
      setBankBalance(analyticsData.bankBalance);
      setTransactions(txList);
      
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleTransactionUpdate = () => {
    fetchDashboard(currentDate);
  };

  useEffect(() => {
    fetchDashboard(currentDate);
    fetchCategoriesData();
  }, [currentDate]);

  const doughnutData = useMemo(() => {
    if (!pieChartData || pieChartData.length === 0) {
      return { labels: [], data: [], colors: [] };
    }
    return {
      labels: pieChartData.map((c) => c.name),
      data: pieChartData.map((c) => c.amount),
      colors: pieChartData.map((c) => c.color)
    };
  }, [pieChartData]);

  const formatMoney = (val) =>
    Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const percentage = summary.projected.income > 0 
    ? Math.abs((100 * summary.projected.expense) / summary.projected.income)
    : 0;

  const getColorByPercentage = (value) => {
    if (value <= 50) return '#10b981'; 
    if (value <= 80) return '#facc15'; 
    return '#ef4444';                    
  };

  return (
    <div className={styles.dashboardPage}>
      <header>
        <div className={styles.headerLeft}>
          <h1>Orbit Dashboard</h1>
          <div className={`${styles.healthBadge} ${styles[health]}`}>
            {health === 'HEALTHY' ? 'Saudável' : health === 'WARNING' ? 'Atenção' : 'Crítico'}
          </div>
        </div>

        {/* 2. AREA DE CONTROLES (BOTÃO + DATA) */}
        <div className={styles.headerControls}>
          <Link href="/dashboard/import" className={styles.btnImport}>
             📄 Importar Extrato
          </Link>
          <MonthSelector value={currentDate} onChange={setCurrentDate} />
        </div>

        {loading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
          </div>
        )}
      </header>

      {/* Cards de Resumo */}
      <div className={styles.summaryCards}>
        <div className={`${styles.card} ${styles.income}`}>
          <span>Entradas</span>
          <h3>{formatMoney(summary.projected.income)}</h3>
        </div>
        <div className={`${styles.card} ${styles.expense}`}>
          <span>Saídas</span>
          <h3>{formatMoney(summary.projected.expense)}</h3>
          <small
            style={{
              fontSize: '0.8rem',
              color: getColorByPercentage(percentage),
            }}
          >
            {percentage.toFixed(1)}% da renda
          </small>
        </div>
        {/* CARD DE SALDO REFORMULADO */}
        <div className={`${styles.card} ${styles.balance}`}>
          <span>Saldo Final Projetado</span>
          
          {/* Valor do Sistema */}
          <h3 className={summary.endOfMonth.finalBalance < 0 ? styles.textRed : ''}>
            {formatMoney(summary.endOfMonth.finalBalance)}
          </h3>

          {/* Comparação com Banco */}
          {bankBalance && (
            <div className={styles.bankReference}>
                <div className={styles.divider}></div>
                <div className={styles.bankRow}>
                    <span>🏦 Banco ({new Date(bankBalance.date).toLocaleDateString()}):</span>
                    <strong>{formatMoney(Number(bankBalance.balance))}</strong>
                </div>
                {/* Diferença Visual */}
                <small className={styles.diff}>
                    Diferença: {formatMoney(Number(bankBalance.balance) - summary.endOfMonth.finalBalance)}
                </small>
            </div>
          )}
        </div>
      </div>

      {/* Área dos Gráficos */}
      <div className={styles.chartsGrid}>
        <div className={`${styles.chartSection} ${styles.mainChart}`}>
          <h3>Fluxo Projetado (30 Dias)</h3>
          {!loading ? <BalanceAreaChart data={chartData} /> : <div className={styles.loading}>Carregando projeção...</div>}
        </div>

        <div className={`${styles.chartSection} ${styles.donutChart}`}>
          <h3>Gastos por Categoria</h3>
          {doughnutData.data.length > 0 ? (
            <DoughnutChart
              labels={doughnutData.labels}
              data={doughnutData.data}
              colors={doughnutData.colors}
            />
          ) : (
            <div className={styles.noData}>Sem gastos no período</div>
          )}
        </div>
      </div>

      {/* Área de Gerenciamento */}
      <div className={styles.gridLayout}>
        <div className={styles.leftCol}>
          <TransactionForm 
            categories={categoriesList} 
            onUpdated={handleTransactionUpdate} 
          />
          <RecurrenceBox 
            categories={categoriesList} 
            // @ts-ignore
            onUpdate={handleTransactionUpdate}
          />
        </div>
        <div className={styles.rightCol}>
          <TransactionList 
            month={undefined}
            year={undefined}
            onUpdate={handleTransactionUpdate} 
            transactions={transactions}
          />
          <CategoryManager 
            categories={categoriesList} 
            onUpdate={fetchCategoriesData} 
          />
        </div>
      </div>
    </div>
  );
}