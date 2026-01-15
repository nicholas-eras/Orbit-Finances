// @ts-nocheck
'use client';

import { useState } from 'react';
import styles from './CategoryManager.module.scss';
// Adicionado updateCategory
import { createCategory, deleteCategory, updateCategory } from '../../api/categories';

export default function CategoryManager({ categories = [], onUpdate }) {
  // Estados de criação
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');

  // Estados de feedback
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  // ========================================
  // NOVO: Estados de Edição
  // ========================================
  const [editingId, setEditingId] = useState(null); // ID da categoria sendo editada
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // ========================================
  // Funções de Edição (Start, Cancel, Save)
  // ========================================
  
  // 1. Iniciar edição: carrega os dados da categoria nos inputs
  function handleStartEdit(cat) {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color);
  }

  // 2. Cancelar edição
  function handleCancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditColor('');
  }

  // 3. Salvar edição
  async function handleSaveEdit(id) {
    if (!editName) return;

    try {
      await updateCategory(id, {
        name: editName,
        color: editColor
      });

      setMessage('Categoria atualizada!');
      setMessageType('success');
      
      setEditingId(null); // Sai do modo edição
      if (onUpdate) onUpdate(); // Recarrega lista

    } catch (err) {
      console.error(err);
      setMessage('Erro ao atualizar categoria.');
      setMessageType('error');
    } finally {
      setTimeout(() => { setMessage(null); setMessageType(null); }, 4000);
    }
  }

  // ========================================
  // Deletar categoria (Mantido)
  // ========================================
  async function handleDelete(id, name) {
    const confirmed = window.confirm(`Tem certeza que deseja excluir a categoria "${name}"?`);
    if (confirmed) {
      try {
        await deleteCategory(id);
        if (onUpdate) onUpdate();
        setMessage('Categoria removida.');
        setMessageType('success');
      } catch (err) {
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
  // Criar nova categoria (Mantido)
  // ========================================
  async function handleAdd() {
    if (!newCatName) return;
    try {
      const colorToUse = newCatColor || getRandomColor();
      await createCategory({ name: newCatName, color: colorToUse });
      if (onUpdate) onUpdate();
      setMessage('Categoria Criada!');
      setMessageType('success');
      setNewCatName('');
      setNewCatColor(getRandomColor());
    } catch (err) {
      setMessage(err.response?.data?.message || 'Erro ao criar categoria.');
      setMessageType('error');
    } finally {
      setTimeout(() => { setMessage(null); setMessageType(null); }, 4000);
    }
  }

  return (
    <div className={styles.categoryManager}>
      <h3>Categorias</h3>

      <div className={styles.tagsContainer}>
        {categories && categories.map(cat => {
          // Verifica se esta é a categoria sendo editada
          const isEditing = editingId === cat.id;

          if (isEditing) {
            // RENDERS: Modo de Edição
            return (
              <div key={cat.id} className={`${styles.tag} ${styles.editing}`} style={{ borderColor: editColor }}>
                <input 
                  type="color" 
                  value={editColor} 
                  onChange={(e) => setEditColor(e.target.value)}
                  className={styles.miniColorPicker}
                />
                <input 
                  type="text" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)}
                  className={styles.editInput}
                  autoFocus
                />
                <div className={styles.editActions}>
                  <button onClick={() => handleSaveEdit(cat.id)} title="Salvar" className={styles.saveBtn}>✓</button>
                  <button onClick={handleCancelEdit} title="Cancelar" className={styles.cancelBtn}>✕</button>
                </div>
              </div>
            );
          } else {
            // RENDERS: Modo de Visualização (Normal)
            return (
              <div
                key={cat.id}
                className={styles.tag}
                style={{
                  backgroundColor: `${cat.color}20`,
                  color: cat.color,
                  borderColor: cat.color
                }}
              >
                <span className={styles.dot} style={{ backgroundColor: cat.color }} />
                {cat.name}
                
                <div className={styles.actions}>
                   {/* Botão Editar (Lápis) */}
                  <button
                    className={styles.editBtn}
                    onClick={() => handleStartEdit(cat)}
                    title="Editar"
                    style={{ color: cat.color }}
                  >
                    ✎
                  </button>

                  {/* Botão Excluir */}
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(cat.id, cat.name)}
                    title="Excluir"
                    style={{ color: cat.color }}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          }
        })}

        {categories?.length === 0 && (
          <div className={styles.emptyState}>Nenhuma categoria criada.</div>
        )}
      </div>

      {/* Formulário de Adicionar (Mantido igual) */}
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