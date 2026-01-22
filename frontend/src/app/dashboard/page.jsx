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

// APIs
import { getTransactions } from "../../api/transactions";
import { getCategories } from "../../api/categories";
import { getDashboardAnalytics } from "../../api/dashboard";
import { updateBankBalance } from "../../api/users";

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

  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalanceValue, setTempBalanceValue] = useState("");

  const handleStartEditing = () => {
    setTempBalanceValue(bankBalance?.balance || 0);
    setIsEditingBalance(true);
  };

  // NOVA FUNÇÃO: Salvar novo saldo
  const handleSaveBalance = async () => {
    try {
      // 1. Atualiza no Backend
      await updateBankBalance(tempBalanceValue);
      
      // 2. Atualiza visualmente (Optimistic Update) ou recarrega
      setBankBalance({
        balance: tempBalanceValue,
        date: new Date().toISOString() // Atualiza a data visualmente para "hoje"
      });
      
      setIsEditingBalance(false);
      
      // Opcional: Recalcular o dashboard para atualizar a "Diferença"
      fetchDashboard(currentDate); 
    } catch (error) {
      alert("Erro ao atualizar saldo");
      console.error(error);
    }
  };

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
  
        {/* --- COLUNA 1: SALDO PROJETADO --- */}
        <div className={styles.balanceColumn}>
          <span>Saldo Final Projetado</span>
          <h3 className={summary.endOfMonth.finalBalance < 0 ? styles.textRed : ''}>
            {formatMoney(summary.endOfMonth.finalBalance)}
          </h3>
        </div>

        {/* Separador Visual (apenas decorativo) */}
        <div className={styles.verticalDivider}></div>

        {/* --- COLUNA 2: SALDO REAL (BANCO) --- */}
        {bankBalance && (
          <div className={styles.balanceColumn}>
            <span className={styles.bankLabel}>
              🏦 Saldo Real ({new Date(bankBalance.date).toLocaleDateString()})
            </span>

            {/* LÓGICA DE EDIÇÃO */}
            {isEditingBalance ? (
              <div className={styles.editContainer}>
                <input
                  type="number"
                  value={tempBalanceValue}
                  onChange={(e) => setTempBalanceValue(e.target.value)}
                  autoFocus
                  className={styles.bigInput}
                />
                <div className={styles.editActions}>
                  <button className={`${styles.btnAction} ${styles.save}`} onClick={handleSaveBalance}>✓</button>
                  <button className={`${styles.btnAction} ${styles.cancel}`} onClick={() => setIsEditingBalance(false)}>✕</button>
                </div>
              </div>
            ) : (
              <strong
                className={`
                  ${styles.editableValue} 
                  ${Number(bankBalance.balance) >= 0 ? styles.positive : styles.negative}
                `}
                onClick={handleStartEditing}
                title="Clique para editar"
              >
                {formatMoney(Number(bankBalance.balance))}
                <span className={styles.editIcon}>✏️</span>
              </strong>
            )}

            {/* Diferença */}
            {!isEditingBalance && (
              <small className={styles.diff}>
                Diff: {formatMoney(Number(bankBalance.balance) - summary.endOfMonth.finalBalance)}
              </small>
            )}
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
          <RecurrenceBox 
            categories={categoriesList} 
            // @ts-ignore
            onUpdate={handleTransactionUpdate}
          />
          <CategoryManager 
            categories={categoriesList} 
            onUpdate={fetchCategoriesData} 
          />
        </div>
        <div className={styles.rightCol}>
          <TransactionList 
            month={undefined}
            year={undefined}
            onUpdate={handleTransactionUpdate} 
            transactions={transactions}
          />
        </div>
      </div>
    </div>
  );
}