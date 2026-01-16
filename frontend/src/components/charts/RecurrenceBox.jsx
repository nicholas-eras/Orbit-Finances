// @ts-nocheck
'use client';

import { useEffect, useState, useMemo } from 'react';
import styles from './RecurrenceBox.module.scss';
import { getRecurrences, createRecurrence, deleteRecurrence, updateRecurrence } from '../../api/recurrences';

// --- Funções Auxiliares ---

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const toLocalIsoString = (date) => {
  const tzo = -date.getTimezoneOffset();
  const dif = tzo >= 0 ? '+' : '-';
  const pad = n => String(n).padStart(2, '0');
  return (
    date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) +
    dif + pad(Math.floor(Math.abs(tzo) / 60)) + ':' + pad(Math.abs(tzo) % 60)
  );
};

const formatCurrency = val => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatFrequency = (freq, interval) => {
  const map = { DAILY: { singular: 'Dia', plural: 'Dias' }, WEEKLY: { singular: 'Semana', plural: 'Semanas' }, MONTHLY: { singular: 'Mês', plural: 'Meses' }, YEARLY: { singular: 'Ano', plural: 'Anos' }, };
  const unit = map[freq];
  if (!unit) return freq; 
  if (interval === 1) return `A cada 1 ${unit.singular}`;
  return `A cada ${interval} ${unit.plural}`;
};

// --- Lógica de Cálculo "Esperta" ---
// Normaliza qualquer frequência para uma estimativa MENSAL
const calculateMonthlyProjection = (amount, frequency, interval) => {
  const value = Math.abs(Number(amount)); 
  const intr = Number(interval) || 1;

  switch (frequency) {
    case 'DAILY':
      // Ex: 10 reais por dia = 300 por mês
      return (value * 30) / intr;
    case 'WEEKLY':
      // Ex: 100 por semana. O ano tem 52 semanas e 12 meses.
      // (100 * 52) / 12 = 433,33 (Média ponderada, pois meses não têm exatamente 4 semanas)
      return (value * 52) / 12 / intr;
    case 'MONTHLY':
      return value / intr;
    case 'YEARLY':
      return value / 12 / intr;
    default:
      return value;
  }
};

export default function RecurrenceBox({ categories = [], onUpdate }) {
  const [list, setList] = useState([]);
  
  // Estados do Formulário
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(getTodayString());
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [interval, setInterval] = useState(1);
  const [frequency, setFrequency] = useState('MONTHLY');
  const [type, setType] = useState('EXPENSE');

  // Estado para controlar Edição
  const [editingId, setEditingId] = useState(null);

  async function fetchRecurrences() {
    try {
      const data = await getRecurrences();
      setList(data);
    } catch (err) {
      console.error('Erro ao buscar recorrências:', err);
    }
  }

  useEffect(() => {
    fetchRecurrences();
  }, []);

  // ========================================
  // CALCULAR TOTAIS (MEMOIZED)
  // ========================================
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;

    list.forEach(rec => {
      // Projeta o impacto mensal
      const monthlyVal = calculateMonthlyProjection(rec.originalAmount, rec.frequency, rec.interval);

      // Se o valor original for negativo, conta como despesa
      if (Number(rec.originalAmount) < 0) {
        expense += monthlyVal;
      } else {
        income += monthlyVal;
      }
    });

    return {
      income,
      expense,
      balance: income - expense
    };
  }, [list]);

  // ========================================
  // AÇÕES (Editar, Cancelar, Salvar, Deletar)
  // ========================================
  function handleStartEdit(rec) {
    setEditingId(rec.id);
    setDescription(rec.description);
    setAmount(Math.abs(rec.originalAmount));
    setType(Number(rec.originalAmount) < 0 ? 'EXPENSE' : 'INCOME');
    
    const isoDate = new Date(rec.startDate).toISOString().split('T')[0];
    setStartDate(isoDate);

    setSelectedCategoryId(rec.categoryId || '');
    setInterval(rec.interval);
    setFrequency(rec.frequency);
    
    document.querySelector(`.${styles.addForm}`).scrollIntoView({ behavior: 'smooth' });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setDescription('');
    setAmount('');
    setStartDate(getTodayString());
    setSelectedCategoryId('');
    setInterval(1);
    setFrequency('MONTHLY');
    setType('EXPENSE');
  }

  async function handleSave() {
    if (!description || !amount || !startDate) return;

    const [y, m, d] = startDate.split('-').map(Number);
    const localDate = new Date(y, m - 1, d, 0, 0, 0);

    const payload = {
      description,
      amount: Number(amount),
      frequency,
      interval,
      startDate: toLocalIsoString(localDate),
      type,
      categoryId: selectedCategoryId || undefined
    };

    try {
      if (editingId) {
        await updateRecurrence(editingId, payload);
        await fetchRecurrences(); 
        setEditingId(null); 
      } else {
        const newRec = await createRecurrence(payload);
        setList(prev => [...prev, newRec]);
      }

      if (onUpdate) onUpdate();
      handleCancelEdit(); // Limpa form

    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar recorrência.');
    }
  }

  async function handleDelete(id, description) {
    if (window.confirm(`Deseja parar a recorrência "${description}"?`)) {
      try {
        await deleteRecurrence(id);
        setList(prev => prev.filter(item => item.id !== id));
        if (onUpdate) onUpdate();
      } catch (err) { console.error(err); }
    }
  }

  return (
    <div className={styles.recurrenceBox}>
      <h3>Contas Fixas & Assinaturas</h3>

      {/* --- DASHBOARD DE RESUMO --- */}
      <div className={styles.summaryBoard}>
        <div className={styles.sumItem}>
          <span>Receita Mensal (Est.)</span>
          <strong className={styles.textIncome}>{formatCurrency(summary.income)}</strong>
        </div>
        <div className={styles.divider}></div>
        <div className={styles.sumItem}>
          <span>Despesa Mensal (Est.)</span>
          <strong className={styles.textExpense}>{formatCurrency(summary.expense)}</strong>
        </div>
        <div className={styles.divider}></div>
        <div className={styles.sumItem}>
          <span>Balanço Recorrente</span>
          <strong className={summary.balance >= 0 ? styles.textIncome : styles.textExpense}>
            {formatCurrency(summary.balance)}
          </strong>
        </div>
      </div>

      <div className={styles.recList}>
        {list.map(rec => (
          <div key={rec.id} className={`${styles.recItem} ${editingId === rec.id ? styles.itemEditing : ''}`}>
            <div className={styles.recInfo}>
              <strong>{rec.description}</strong>
              <div className={styles.metaInfo}>
                <small>{formatFrequency(rec.frequency, rec.interval)}</small>
                {rec.category && (
                  <span className={styles.catBadge} style={{ color: rec.category.color }}>
                    • {rec.category.name}
                  </span>
                )}
              </div>
            </div>
            
            <div className={styles.rightSide}>
              <div className={`${styles.recAmount} ${(rec.type === 'EXPENSE' || Number(rec.originalAmount) < 0) ? styles.isExpense : styles.isIncome}`}>
                {formatCurrency(rec.originalAmount)}
              </div>
              
              <button className={styles.editBtn} onClick={() => handleStartEdit(rec)} title="Editar">
                ✎
              </button>
              <button className={styles.deleteBtn} onClick={() => handleDelete(rec.id, rec.description)} title="Excluir">
                🗑️
              </button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className={styles.empty}>Nenhuma recorrência ainda.</div>}
      </div>

      <div className={`${styles.addForm} ${editingId ? styles.formEditing : ''}`}>
        <div className={styles.formHeader}>
          <h4>{editingId ? 'Editar Recorrência' : 'Nova Recorrência'}</h4>
          {editingId && (
            <button onClick={handleCancelEdit} className={styles.cancelLink}>
              Cancelar
            </button>
          )}
        </div>

        <div className={styles.typeToggle}>
          <button type="button" className={`${type === 'EXPENSE' ? styles.active : ''} ${styles.btnExpense}`} onClick={() => setType('EXPENSE')}>Saída</button>
          <button type="button" className={`${type === 'INCOME' ? styles.active : ''} ${styles.btnIncome}`} onClick={() => setType('INCOME')}>Entrada</button>
        </div>
        
        <div className={styles.inputs}>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Seguro Carro" />
          <select value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)} className={!selectedCategoryId ? styles.placeholder : ''}>
            <option value="" disabled>Categoria</option>
            {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Valor" />
          
          <div className={styles.frequencyControl}>
            <span>A cada</span>
            <input type="number" min="1" value={interval} onChange={e => setInterval(Number(e.target.value))} className={styles.intervalInput} />
            <select value={frequency} onChange={e => setFrequency(e.target.value)}>
              <option value="DAILY">Dia(s)</option>
              <option value="WEEKLY">Semana(s)</option>
              <option value="MONTHLY">Mês(es)</option>
              <option value="YEARLY">Ano(s)</option>
            </select>
          </div>
          
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          
          <button onClick={handleSave} className={editingId ? styles.saveUpdateBtn : ''}>
            {editingId ? 'Salvar Alterações' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}