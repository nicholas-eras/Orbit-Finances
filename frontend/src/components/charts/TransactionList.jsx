/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useState } from 'react';
import styles from './TransactionList.module.scss';
import { getTransactions } from '../../api/transactions';

export default function TransactionList({ month, year }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  // ==========================
  // Busca transações do backend
  // ==========================
  async function fetchTransactions() {
    try {
      setLoading(true);
      const data = await getTransactions(month, year);
      setList(data);
    } catch (err) {
      console.error('Erro ao buscar transações:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTransactions();
  }, [month, year]);

  // ==========================
  // Formata valor como moeda
  // ==========================
  const formatCurrency = (val) => {
    return Number(val).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // ==========================
  // Formata data no padrão DD/MM
  // ==========================
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const isoDate = dateStr.toString().split('T')[0];
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}`;
  };

  return (
    <div className={styles.txList}>
      <h3>Últimas Movimentações</h3>

      {loading && <div className={styles.loading}>Carregando...</div>}

      {!loading && list.length === 0 && (
        <div className={styles.empty}>Nada por aqui ainda.</div>
      )}

      {list.map(tx => (
        <div key={tx.id} className={styles.txItem}>
          <div className={styles.txDate}>{formatDate(tx.date)}</div>

          <div className={styles.txInfo}>
            <div className={styles.txDesc}>{tx.description}</div>

            {tx.category && (
              <div
                className={styles.txCat}
                style={{ color: tx.category.color }}
              >
                {tx.category.name}
              </div>
            )}
          </div>

          <div
            className={`${styles.txAmount} ${
              Number(tx.amount) < 0 ? styles.isExpense : styles.isIncome
            }`}
          >
            {formatCurrency(tx.amount)}
          </div>
        </div>
      ))}
    </div>
  );
}
