/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useState } from 'react';
import styles from './TransactionList.module.scss';
import { getTransactions, deleteTransaction } from '../../api/transactions';

// Adicionado prop 'transactions'
export default function TransactionList({ month, year, onUpdate, transactions }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  // ==========================
  // Lógica Híbrida:
  // 1. Se receber 'transactions' via props, usa ela (Sincronizado com Pai).
  // 2. Se não receber, busca sozinho (Stand-alone).
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
    // Se a lista veio do pai, apenas atualizamos o estado local
    if (transactions) {
      setList(transactions);
      setLoading(false);
    } else {
      // Caso contrário, buscamos na API
      fetchTransactions();
    }
  }, [month, year, transactions]); // Adicionado 'transactions' nas dependências

  // ==========================
  // Deletar Transação
  // ==========================
  async function handleDelete(id, description) {
    const confirmed = window.confirm(`Deseja excluir a transação "${description}"?`);
    
    if (confirmed) {
      try {
        await deleteTransaction(id);
        
        // Remove localmente (Optimistic Update)
        setList(prev => prev.filter(tx => tx.id !== id));

        // Avisa o Pai (Dashboard) para recalcular saldos, gráficos E mandar a lista nova
        if (onUpdate) onUpdate();

      } catch (err) {
        console.error('Erro ao deletar:', err);
        alert('Erro ao excluir transação.');
      }
    }
  }

  // ==========================
  // Formatações
  // ==========================
  const formatCurrency = (val) => {
    return Number(val).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

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
          <div className={styles.leftGroup}>
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
          </div>

          <div className={styles.rightGroup}>
            <div
              className={`${styles.txAmount} ${
                Number(tx.amount) < 0 || tx.type === 'EXPENSE' ? styles.isExpense : styles.isIncome
              }`}
            >
              {formatCurrency(tx.amount)}
            </div>

            <button 
              className={styles.deleteBtn}
              onClick={() => handleDelete(tx.id, tx.description)}
              title="Excluir"
            >
              🗑️
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}