'use client';

import { useMemo } from 'react';
import styles from './MonthSelector.module.scss';

export default function MonthSelector({ value, onChange }) {
  // "Janeiro 2026"
  const label = useMemo(() => {
    return value.toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric'
    });
  }, [value]);

  function changeMonth(offset) {
    const newDate = new Date(value);
    newDate.setMonth(newDate.getMonth() + offset);
    onChange(newDate);
  }

  return (
    <div className={styles.monthSelector}>
      <button onClick={() => changeMonth(-1)}>&lt;</button>
      <span>{label}</span>
      <button onClick={() => changeMonth(1)}>&gt;</button>
    </div>
  );
}
