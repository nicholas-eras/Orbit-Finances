// @ts-nocheck
/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useState } from 'react';
import styles from './TransactionList.module.scss';
// Adicione updateTransaction
import { getTransactions, deleteTransaction, updateTransaction } from '../../api/transactions';

// Adicione categories nas props
export default function TransactionList({ month, year, onUpdate, transactions, categories = [] }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // --- FUNÇÕES DE EDIÇÃO ---

  function handleStartEdit(tx) {
    setEditingId(tx.id);
    setEditDesc(tx.description);
    // Remove sinal negativo visualmente para editar
    setEditAmount(Math.abs(tx.amount));
    setEditCatId(tx.categoryId || '');
    
    // Define tipo baseado no valor ou type
    const isExpense = Number(tx.amount) < 0 || tx.type === 'EXPENSE';
    setEditType(isExpense ? 'EXPENSE' : 'INCOME');

    // Data para input (YYYY-MM-DD)
    const dateObj = new Date(tx.date);
    const isoDate = dateObj.toISOString().split('T')[0];
    setEditDate(isoDate);
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
        date: new Date(editDate + 'T12:00:00'), // Fix horário meio-dia para evitar mudança de dia
        categoryId: editCatId || null,
        type: editType
      });

      // Atualiza lista localmente (opcional, pois o onUpdate vai recarregar tudo)
      setEditingId(null);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Erro ao atualizar:', err);
      alert('Erro ao salvar edição.');
    }
  }

  // --- FUNÇÕES EXISTENTES ---

  async function handleDelete(id, description) {
    const confirmed = window.confirm(`Deseja excluir a transação "${description}"?`);
    if (confirmed) {
      try {
        await deleteTransaction(id);
        setList(prev => prev.filter(tx => tx.id !== id));
        if (onUpdate) onUpdate();
      } catch (err) {
        console.error('Erro ao deletar:', err);
      }
    }
  }

  const formatCurrency = (val) => {
    return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const str = typeof dateStr === 'object' ? dateStr.toISOString() : dateStr;
    const isoDate = str.split('T')[0];
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}`;
  };

  return (
    <div className={styles.txList}>
      <h3>Movimentações</h3>

      {loading && <div className={styles.loading}>Carregando...</div>}
      {!loading && list.length === 0 && <div className={styles.empty}>Nada por aqui ainda.</div>}

      {list.map(tx => {
        const isProjected = tx.isProjected;
        const isEditing = editingId === tx.id;

        // --- MODO EDIÇÃO ---
        if (isEditing) {
          return (
            <div key={tx.id} className={`${styles.txItem} ${styles.editingItem}`}>
              <div className={styles.editInputsGroup}>
                {/* Data */}
                <input 
                  type="date" 
                  className={styles.miniInputDate}
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                />

                {/* Descrição */}
                <input 
                  type="text" 
                  className={styles.miniInputText}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Descrição"
                  autoFocus
                />

                {/* Categoria */}
                <select 
                  className={styles.miniSelect}
                  value={editCatId}
                  onChange={e => setEditCatId(e.target.value)}
                >
                  <option value="">Sem Categoria</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>

                {/* Valor */}
                <div className={styles.amountInputWrapper}>
                  <select 
                    className={editType === 'EXPENSE' ? styles.typeExp : styles.typeInc}
                    value={editType}
                    onChange={e => setEditType(e.target.value)}
                  >
                    <option value="EXPENSE">-</option>
                    <option value="INCOME">+</option>
                  </select>
                  <input 
                    type="number" 
                    className={styles.miniInputAmount}
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.editActions}>
                <button onClick={() => handleSaveEdit(tx.id)} className={styles.saveBtn}>✓</button>
                <button onClick={handleCancelEdit} className={styles.cancelBtn}>✕</button>
              </div>
            </div>
          );
        }

        // --- MODO VISUALIZAÇÃO ---
        return (
          <div key={tx.id} className={`${styles.txItem} ${isProjected ? styles.projectedItem : ''}`}>
            <div className={styles.leftGroup}>
              <div className={styles.txDate}>{formatDate(tx.date)}</div>
              <div className={styles.txInfo}>
                <div className={styles.txDesc}>
                  {tx.description}
                  {tx.recurrenceId && <span className={styles.badgeScheduled}>Recorrente</span>}
                </div>
                {tx.category && (
                  <div className={styles.txCat} style={{ color: tx.category.color }}>
                    {tx.category.name}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.rightGroup}>
              <div className={`${styles.txAmount} ${Number(tx.amount) < 0 || tx.type === 'EXPENSE' ? styles.isExpense : styles.isIncome}`}>
                {formatCurrency(tx.amount)}
              </div>

              {!isProjected ? (
                <>
                  {/* Botão Editar */}
                  <button 
                    className={styles.actionBtn} 
                    onClick={() => handleStartEdit(tx)}
                    title="Editar"
                  >
                    ✎
                  </button>
                  {/* Botão Deletar */}
                  <button 
                    className={`${styles.actionBtn} ${styles.btnDelete}`} 
                    onClick={() => handleDelete(tx.id, tx.description)}
                    title="Excluir"
                  >
                    🗑️
                  </button>
                </>
              ) : (
                <div style={{ width: '48px' }} /> // Espaço vazio para alinhar
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}