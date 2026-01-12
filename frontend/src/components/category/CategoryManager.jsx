'use client';

import { useEffect, useState } from 'react';
import styles from './CategoryManager.module.scss';
import { createCategory, getCategories } from '../../api/categories';

export default function CategoryManager() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');

  // ========================================
  // Busca categorias do backend
  // ========================================
  async function fetchCategories() {
    try {
      setLoading(true);
      const data = await getCategories();
      setList(data);
    } catch (err) {
      console.error('Erro ao buscar categorias:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  // ========================================
  // Cria nova categoria
  // ========================================
  async function handleAdd() {
    if (!newCatName) return;

    try {
      const newCat = await createCategory({
        name: newCatName,
        color: newCatColor
      });

      // Atualiza lista no frontend sem refazer fetch
      setList(prev => [...prev, newCat]);
      setNewCatName('');
    } catch (err) {
      console.error('Erro ao criar categoria:', err);
    }
  }

  return (
    <div className={styles.categoryManager}>
      <h3>Categorias</h3>

      <div className={styles.tagsContainer}>
        {list && list.map(cat => (
          <div
            key={cat.id}
            className={styles.tag}
            style={{
              backgroundColor: `${cat.color}20`,
              color: cat.color,
              borderColor: cat.color
            }}
          >
            <span
              className={styles.dot}
              style={{ backgroundColor: cat.color }}
            />
            {cat.name}
          </div>
        ))}

        {!loading && list?.length === 0 && (
          <div className={styles.emptyState}>
            Nenhuma categoria criada.
          </div>
        )}
      </div>

      <div className={styles.addForm}>
        <input
          type="text"
          placeholder="Nova categoria (ex: Lazer)"
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          onKeyUp={e => e.key === 'Enter' && handleAdd()}
        />

        <input
          type="color"
          value={newCatColor}
          onChange={e => setNewCatColor(e.target.value)}
          className={styles.colorPicker}
        />

        <button onClick={handleAdd}>+</button>
      </div>
    </div>
  );
}
