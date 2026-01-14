'use client';

import { useState } from "react";
import styles from './TransactionForm.module.scss';
import { createTransaction } from "../../api/transactions";

// Funções auxiliares de data (iguais às do RecurrenceBox)
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

// Agora recebe 'categories' do componente Pai (DashboardPage)
export default function TransactionForm({ categories = [], onUpdated }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [selectedCategory, setSelectedCategory] = useState('');
  const [type, setType] = useState('EXPENSE');

  // Removido o useEffect e fetchCategories interno.
  // Usamos os dados vindos via props.

  // ========================================
  // Submete nova transação
  // ========================================
  async function handleSubmit() {
    if (!amount || !description) return;

    const [y, m, d] = date.split('-').map(Number);
    const localDate = new Date(y, m - 1, d, 0, 0, 0);

    try {
      await createTransaction({
        amount: Number(amount),
        description,
        date: toLocalIsoString(localDate),
        categoryId: selectedCategory || undefined,
        type
      });

      // Reset form
      setAmount('');
      setDescription('');
      setDate(getTodayString());
      setSelectedCategory('');

      // Notifica o pai para atualizar gráficos e listas
      if (onUpdated) onUpdated();
      
    } catch (err) {
      console.error('Erro ao criar transação:', err);
    }
  }

  return (
    <div className={styles.txForm}>
      <h3>Nova Transação</h3>

      <div className={styles.typeToggle}>
        <button
          className={`${type === 'EXPENSE' ? styles.active : ''} ${styles.btnExpense}`}
          onClick={() => setType('EXPENSE')}
        >
          Saída
        </button>
        <button
          className={`${type === 'INCOME' ? styles.active : ''} ${styles.btnIncome}`}
          onClick={() => setType('INCOME')}
        >
          Entrada
        </button>
      </div>

      <div className={styles.inputs}>
        <input 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)} 
        />

        <input
          type="number"
          step="0.01"
          placeholder="Valor (0.00)"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />

        <input
          type="text"
          placeholder="Descrição (ex: Almoço)"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />

        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className={!selectedCategory ? styles.placeholder : ''}
        >
          <option value="" disabled>Selecione a Categoria</option>
          <option value="">Sem Categoria</option>
          {/* Mapeia as categorias recebidas via props */}
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <button onClick={handleSubmit} className={styles.btnSave}>
          Salvar
        </button>
      </div>
    </div>
  );
}