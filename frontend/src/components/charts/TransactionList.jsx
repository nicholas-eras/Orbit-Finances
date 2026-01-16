// @ts-nocheck
'use client';

import { useEffect, useState, useMemo } from 'react';
import styles from './TransactionList.module.scss';
import { getTransactions, deleteTransaction, updateTransaction } from '../../api/transactions';
import TransactionForm from '../forms/TransactionForm';

export default function TransactionList({ month, year, onUpdate, transactions, categories = [] }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estado para mostrar/esconder o formulário
  const [showAddForm, setShowAddForm] = useState(false);

  // --- ESTADOS DE EDIÇÃO ---
  const [editingId, setEditingId] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editCatId, setEditCatId] = useState('');
  const [editType, setEditType] = useState('EXPENSE');

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

  // ==========================================
  // CÁLCULO DE TOTAIS (MÊS COMPLETO)
  // ==========================================
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;

    list.forEach(tx => {
      const val = Number(tx.amount);
      if (val < 0) {
        expense += val;
      } else {
        income += val;
      }
    });

    return {
      income,
      expense,
      balance: income + expense
    };
  }, [list]);

  // --- Funções de Edição ---
  function handleStartEdit(tx) {
    setEditingId(tx.id);
    setEditDesc(tx.description);
    setEditAmount(Math.abs(tx.amount));
    setEditCatId(tx.categoryId || '');
    const isExpense = Number(tx.amount) < 0 || tx.type === 'EXPENSE';
    setEditType(isExpense ? 'EXPENSE' : 'INCOME');
    
    const dateObj = new Date(tx.date);
    if (!isNaN(dateObj)) {
        const isoDate = dateObj.toISOString().split('T')[0];
        setEditDate(isoDate);
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditDesc('');
    setEditAmount('');
    setEditDate('');
    setEditCatId('');
  }

  async function handleSaveEdit(id) {
    try {
      await updateTransaction(id, {
        description: editDesc,
        amount: Number(editAmount),
        date: new Date(editDate + 'T12:00:00'),
        categoryId: editCatId || null,
        type: editType
      });
      setEditingId(null);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Erro ao atualizar:', err);
      alert('Erro ao salvar edição.');
    }
  }

  async function handleDelete(id, description) {
    const confirmed = window.confirm(`Deseja excluir a transação "${description}"?`);
    if (confirmed) {
      try {
        await deleteTransaction(id);
        setList(prev => prev.filter(tx => tx.id !== id));
        if (onUpdate) onUpdate();
      } catch (err) { console.error('Erro ao deletar:', err); }
    }
  }

  const handleFormSuccess = () => {
    if (onUpdate) onUpdate(); 
  };

  const formatCurrency = (val) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className={styles.txList}>
      
      {/* HEADER FIXO */}
      <div className={styles.listHeader}>
        <h3>Extrato do Mês</h3>
        <button 
          className={styles.btnToggleForm} 
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '✕ Fechar' : '+ Nova'}
        </button>
      </div>

      {/* FORMULÁRIO (Fica acima da rolagem) */}
      {showAddForm && (
        <div className={styles.embeddedFormContainer}>
          <TransactionForm 
            categories={categories} 
            onUpdated={handleFormSuccess} 
          />
        </div>
      )}

      {/* BARRA DE RESUMO (Fixa) */}
      <div className={styles.summaryBoard}>
        <div className={styles.sumItem}>
          <span>Entradas</span>
          <strong className={styles.textIncome}>{formatCurrency(summary.income)}</strong>
        </div>
        <div className={styles.divider}></div>
        <div className={styles.sumItem}>
          <span>Saídas</span>
          <strong className={styles.textExpense}>{formatCurrency(Math.abs(summary.expense))}</strong>
        </div>
        <div className={styles.divider}></div>
        <div className={styles.sumItem}>
          <span>Saldo</span>
          <strong className={summary.balance >= 0 ? styles.textIncome : styles.textExpense}>
            {formatCurrency(summary.balance)}
          </strong>
        </div>
      </div>

      {/* --- ÁREA COM ROLAGEM (SCROLL) --- */}
      <div className={styles.transactionsScroll}>
        
        {loading && <div className={styles.loading}>Carregando...</div>}
        
        {!loading && list.length === 0 && !showAddForm && (
          <div className={styles.empty}>Nada por aqui ainda.</div>
        )}

        {list.map(tx => {
          const isProjected = tx.isProjected;
          const isEditing = editingId === tx.id;

          if (isEditing) {
            return (
              <div key={tx.id} className={`${styles.txItem} ${styles.editingItem}`}>
                <div className={styles.editInputsGroup}>
                  <input type="date" className={styles.miniInputDate} value={editDate} onChange={e => setEditDate(e.target.value)} />
                  <input type="text" className={styles.miniInputText} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descrição" autoFocus />
                  <select className={styles.miniSelect} value={editCatId} onChange={e => setEditCatId(e.target.value)}>
                    <option value="">Sem Categoria</option>
                    {categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                  </select>
                  <div className={styles.amountInputWrapper}>
                    <select className={editType === 'EXPENSE' ? styles.typeExp : styles.typeInc} value={editType} onChange={e => setEditType(e.target.value)}>
                      <option value="EXPENSE">-</option>
                      <option value="INCOME">+</option>
                    </select>
                    <input type="number" className={styles.miniInputAmount} value={editAmount} onChange={e => setEditAmount(e.target.value)} />
                  </div>
                </div>
                <div className={styles.editActions}>
                  <button onClick={() => handleSaveEdit(tx.id)} className={styles.saveBtn}>✓</button>
                  <button onClick={handleCancelEdit} className={styles.cancelBtn}>✕</button>
                </div>
              </div>
            );
          }

          return (
            <div key={tx.id} className={`${styles.txItem} ${isProjected ? styles.projectedItem : ''}`}>
              
              {/* BLOCO 1: DATA */}
              <div className={styles.colDate}>
                {formatDate(tx.date)}
              </div>

              {/* BLOCO 2: INFORMAÇÕES (Descrição + Badges) */}
              <div className={styles.colInfo}>
                <div className={styles.txDesc}>
                  {tx.description}
                </div>
                <div className={styles.badgesWrapper}>
                  {isProjected && <span className={styles.badgeProjected}>Previsto</span>}
                  {tx.recurrenceId && <span className={styles.badgeScheduled}>Recorrente</span>}
                  {tx.category && (
                    <span className={styles.txCat} style={{ color: tx.category.color }}>
                      • {tx.category.name}
                    </span>
                  )}
                </div>
              </div>

              {/* BLOCO 3: VALOR */}
              <div className={`${styles.colAmount} ${Number(tx.amount) < 0 || tx.type === 'EXPENSE' ? styles.isExpense : styles.isIncome}`}>
                {formatCurrency(tx.amount)}
              </div>

              {/* BLOCO 4: AÇÕES */}
              <div className={styles.colActions}>
                {!isProjected ? (
                  <>
                    <button className={styles.actionBtn} onClick={() => handleStartEdit(tx)}>✎</button>
                    <button className={`${styles.actionBtn} ${styles.btnDelete}`} onClick={() => handleDelete(tx.id, tx.description)}>🗑️</button>
                  </>
                ) : (
                  <span className={styles.loadingIcon}>⏳</span>
                )}
              </div>
            </div>
          );
        })}
      </div> 
      {/* Fim da div transactionsScroll */}

    </div>
  );
}