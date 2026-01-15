// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import styles from './RecurrenceBox.module.scss';
// Adicionado updateRecurrence
import { getRecurrences, createRecurrence, deleteRecurrence, updateRecurrence } from '../../api/recurrences';

// ... funções auxiliares (getTodayString, toLocalIsoString, etc) mantidas ...
const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const toLocalIsoString = (date) => { /* ... sua função existente ... */ 
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
const formatFrequency = (freq, interval) => { /* ... sua função existente ... */ 
  const map = { DAILY: { singular: 'Dia', plural: 'Dias' }, WEEKLY: { singular: 'Semana', plural: 'Semanas' }, MONTHLY: { singular: 'Mês', plural: 'Meses' }, YEARLY: { singular: 'Ano', plural: 'Anos' }, };
  const unit = map[freq];
  if (!unit) return freq; 
  if (interval === 1) return `A cada 1 ${unit.singular}`;
  return `A cada ${interval} ${unit.plural}`;
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

  // NOVO: Estado para controlar Edição
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
  // PREPARAR EDIÇÃO (Ao clicar no Lápis)
  // ========================================
  function handleStartEdit(rec) {
    setEditingId(rec.id);
    
    // Preenche o formulário
    setDescription(rec.description);
    // Converte valor absoluto (tira o negativo visualmente)
    setAmount(Math.abs(rec.originalAmount));
    // Define se é despesa ou receita
    setType(Number(rec.originalAmount) < 0 ? 'EXPENSE' : 'INCOME');
    
    // Datas: Prisma manda ISO completo, o input date quer YYYY-MM-DD
    const isoDate = new Date(rec.startDate).toISOString().split('T')[0];
    setStartDate(isoDate);

    setSelectedCategoryId(rec.categoryId || '');
    setInterval(rec.interval);
    setFrequency(rec.frequency);
    
    // Rola a tela até o formulário (opcional, bom para mobile)
    document.querySelector(`.${styles.addForm}`).scrollIntoView({ behavior: 'smooth' });
  }

  // ========================================
  // CANCELAR EDIÇÃO
  // ========================================
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

  // ========================================
  // SALVAR (Criar ou Atualizar)
  // ========================================
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
        // --- MODO UPDATE ---
        await updateRecurrence(editingId, payload);
        
        // Atualiza a lista localmente (otimista ou refetch)
        await fetchRecurrences(); 
        setEditingId(null); // Sai do modo edição
      } else {
        // --- MODO CREATE ---
        const newRec = await createRecurrence(payload);
        setList(prev => [...prev, newRec]);
      }

      if (onUpdate) onUpdate();
      
      // Limpa formulário (se não for edição, ou após sucesso da edição)
      handleCancelEdit(); // Reusa a função de resetar

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
              
              {/* Botão Editar (Lápis) */}
              <button 
                className={styles.editBtn} 
                onClick={() => handleStartEdit(rec)}
                title="Editar"
              >
                ✎
              </button>

              <button 
                className={styles.deleteBtn} 
                onClick={() => handleDelete(rec.id, rec.description)}
                title="Excluir"
              >
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