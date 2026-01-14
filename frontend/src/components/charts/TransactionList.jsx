/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useState } from 'react';
import styles from './TransactionList.module.scss';
import { getTransactions, deleteTransaction } from '../../api/transactions';

export default function TransactionList({ month, year, onUpdate, transactions }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

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
    if (transactions) {
      setList(transactions);
      setLoading(false);
    } else {
      fetchTransactions();
    }
  }, [month, year, transactions]);

  async function handleDelete(id, description) {
    const confirmed = window.confirm(`Deseja excluir a transação "${description}"?`);
    
    if (confirmed) {
      try {
        await deleteTransaction(id);
        setList(prev => prev.filter(tx => tx.id !== id));
        if (onUpdate) onUpdate();
      } catch (err) {
        console.error('Erro ao deletar:', err);
        alert('Erro ao excluir transação.');
      }
    }
  }

  const formatCurrency = (val) => {
    return Number(val).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    // Garante que funciona mesmo se vier objeto Date
    const str = typeof dateStr === 'object' ? dateStr.toISOString() : dateStr;
    const isoDate = str.split('T')[0];
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}`;
  };

  return (
    <div className={styles.txList}>
      <h3>Movimentações</h3>

      {loading && <div className={styles.loading}>Carregando...</div>}

      {!loading && list.length === 0 && (
        <div className={styles.empty}>Nada por aqui ainda.</div>
      )}

      {list.map(tx => {
        // Verifica se é projeção
        const isProjected = tx.isProjected; 

        return (
          <div 
            key={tx.id} 
            className={`${styles.txItem} ${isProjected ? styles.projectedItem : ''}`}
          >
            <div className={styles.leftGroup}>
              <div className={styles.txDate}>{formatDate(tx.date)}</div>

              <div className={styles.txInfo}>
                <div className={styles.txDesc}>
                  {tx.description}
                  {/* Badge de Programado */}
                  {/* {isProjected && (
                    <span className={styles.badgeScheduled}>Recorrente</span>
                  )} */}
                  {tx.recurrenceId && (
                    <span className={styles.badgeScheduled}>Recorrente</span>
                  )}
                </div>

                {tx.category && (
                  <div
                    className={styles.txCat}
                    style={{ color: tx.category.color }}
                  >
                    {tx.category.name}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.rightGroup}>
              <div
                className={`${styles.txAmount} ${
                  Number(tx.amount) < 0 || tx.type === 'EXPENSE' ? styles.isExpense : styles.isIncome
                }`}
              >
                {formatCurrency(tx.amount)}
              </div>

              {/* Só mostra delete se NÃO for projetado */}
              {!isProjected ? (
                <button 
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(tx.id, tx.description)}
                  title="Excluir"
                >
                  🗑️
                </button>
              ) : (
                // Opcional: Um placeholder invisível para manter alinhamento
                <div style={{ width: '24px' }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}