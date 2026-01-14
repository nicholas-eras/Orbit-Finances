'use client';

import { useState } from 'react';
import styles from './CategoryManager.module.scss';
// Adicionado deleteCategory
import { createCategory, deleteCategory } from '../../api/categories';

export default function CategoryManager({ categories = [], onUpdate }) {
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');

  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // ========================================
  // Deletar categoria
  // ========================================
  async function handleDelete(id, name) {
    const confirmed = window.confirm(`Tem certeza que deseja excluir a categoria "${name}"?\nTransações com esta categoria podem ficar sem classificação.`);

    if (confirmed) {
      try {
        await deleteCategory(id);
        
        // Atualiza a lista global
        if (onUpdate) onUpdate();
        
        setMessage('Categoria removida.');
        setMessageType('success');
      } catch (err) {
        console.error('Erro ao deletar:', err);
        // Tratamento simples de erro de chave estrangeira (caso o backend barre)
        if (err.response?.status === 500) {
          setMessage('Não é possível excluir categoria em uso.');
        } else {
          setMessage('Erro ao excluir categoria.');
        }
        setMessageType('error');
      } finally {
        setTimeout(() => { setMessage(null); setMessageType(null); }, 4000);
      }
    }
  }

  // ========================================
  // Cria nova categoria
  // ========================================
  async function handleAdd() {
    if (!newCatName) return;

    try {
      const colorToUse = newCatColor || getRandomColor();

      await createCategory({
        name: newCatName,
        color: colorToUse
      });

      if (onUpdate) onUpdate();

      setMessage('Categoria Criada!');
      setMessageType('success');
      setNewCatName('');
      setNewCatColor(getRandomColor()); // Gera nova cor aleatória para a próxima
    } catch (err) {
      if (err.response?.data?.message) {
        setMessage(err.response.data.message);
      } else if (err.message) {
        setMessage(err.message);
      } else {
        setMessage('Erro ao criar categoria.');
      }
      setMessageType('error');
    } finally {
      setTimeout(() => { setMessage(null); setMessageType(null); }, 4000);
    }
  }

  return (
    <div className={styles.categoryManager}>
      <h3>Categorias</h3>

      <div className={styles.tagsContainer}>
        {categories && categories.map(cat => (
          <div
            key={cat.id}
            className={styles.tag}
            style={{
              backgroundColor: `${cat.color}20`, // 20% de opacidade no fundo
              color: cat.color,
              borderColor: cat.color
            }}
          >
            <span
              className={styles.dot}
              style={{ backgroundColor: cat.color }}
            />
            {cat.name}
            
            {/* Botão de Excluir (X) */}
            <button
              className={styles.deleteBtn}
              onClick={() => handleDelete(cat.id, cat.name)}
              title="Excluir categoria"
              style={{ color: cat.color }} // Herda a cor da categoria
            >
              ×
            </button>
          </div>
        ))}

        {categories?.length === 0 && (
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
        <button
          type="button"
          onClick={() => setNewCatColor(getRandomColor())}
          className={styles.colorPicker}
          style={{ backgroundColor: newCatColor, color: '#fff', border: 'none' }}
        >
          🎲
        </button>
        <button onClick={handleAdd}>+</button>
      </div>
      {message && (
        <div className={`${styles.message} ${messageType === 'error' ? styles.error : styles.success}`}>
          {message}
        </div>
      )}
    </div>
  );
}