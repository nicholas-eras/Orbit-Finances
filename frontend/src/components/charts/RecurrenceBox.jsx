/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useEffect, useState } from 'react';
import styles from './RecurrenceBox.module.scss';
import { getCategories } from '../../api/categories';
import { getRecurrences, createRecurrence } from '../../api/recurrences';


/* -------- FUNÇÕES DE DATA -------- */
const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const toLocalIsoString = (date) => {
  const tzo = -date.getTimezoneOffset();
  const dif = tzo >= 0 ? '+' : '-';
  const pad = n => String(n).padStart(2, '0');

  return (
    date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds()) +
    dif + pad(Math.floor(Math.abs(tzo) / 60)) +
    ':' + pad(Math.abs(tzo) % 60)
  );
};

const formatCurrency = val =>
  Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatFrequency = (freq, int) => {
  const map = {
    DAILY: 'Dia(s)',
    WEEKLY: 'Semana(s)',
    MONTHLY: 'Mês(es)',
    YEARLY: 'Ano(s)'
  };
  const unit = map[freq] || freq;
  if (int === 1) return unit.replace('(s)', '').replace('(es)', '');
  return `A cada ${int} ${unit}`;
};

export default function RecurrenceBox() {
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(getTodayString());
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [interval, setInterval] = useState(1);
  const [frequency, setFrequency] = useState('MONTHLY');

  // ========================================
  // Busca categorias e recorrências
  // ========================================
  async function fetchCategories() {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    }
  }

  async function fetchRecurrences() {
    try {
      const data = await getRecurrences();
      setList(data);
    } catch (err) {
      console.error('Erro ao buscar recorrências:', err);
    }
  }

  useEffect(() => {
    fetchCategories();
    fetchRecurrences();
  }, []);

  // ========================================
  // Cria nova recorrência
  // ========================================
  async function handleSave() {
    if (!description || !amount || !startDate) return;

    const [y, m, d] = startDate.split('-').map(Number);
    const localDate = new Date(y, m - 1, d, 0, 0, 0);

    try {
      const newRecurrence = await createRecurrence({
        description,
        amount: Number(amount),
        // @ts-ignore
        frequency,
        interval,
        startDate: toLocalIsoString(localDate),
        type: 'EXPENSE',
        categoryId: selectedCategoryId || undefined
      });

      setList(prev => [...prev, newRecurrence]);

      // Reseta form
      setDescription('');
      setAmount('');
      setStartDate(getTodayString());
      setSelectedCategoryId('');
      setInterval(1);
    } catch (err) {
      console.error('Erro ao criar recorrência:', err);
    }
  }

  return (
    <div className={styles.recurrenceBox}>
      <h3>Contas Fixas & Assinaturas</h3>

      <div className={styles.recList}>
        {list.map(rec => (
          <div key={rec.id} className={styles.recItem}>
            <div className={styles.recInfo}>
              <strong>{rec.description}</strong>
              <small>{formatFrequency(rec.frequency, rec.interval)}</small>
            </div>
            <div className={styles.recAmount}>
              {formatCurrency(rec.originalAmount)}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.addForm}>
        <h4>Nova Recorrência</h4>

        <div className={styles.inputs}>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ex: Seguro Carro"
          />

          <select
            value={selectedCategoryId}
            onChange={e => setSelectedCategoryId(e.target.value)}
            className={!selectedCategoryId ? styles.placeholder : ''}
          >
            <option value="" disabled>Categoria</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Valor"
          />

          <div className={styles.frequencyControl}>
            <span>A cada</span>
            <input
              type="number"
              min="1"
              value={interval}
              onChange={e => setInterval(Number(e.target.value))}
              className={styles.intervalInput}
            />
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value)}
            >
              <option value="DAILY">Dia(s)</option>
              <option value="WEEKLY">Semana(s)</option>
              <option value="MONTHLY">Mês(es)</option>
              <option value="YEARLY">Ano(s)</option>
            </select>
          </div>

          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />

          <button onClick={handleSave}>Adicionar</button>
        </div>
      </div>
    </div>
  );
}
