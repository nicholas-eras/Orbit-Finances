<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCategoryStore } from '../stores/categories';

const categoryStore = useCategoryStore();
const newCatName = ref('');
const newCatColor = ref('#3b82f6'); 

onMounted(() => {
  categoryStore.fetchCategories();
});

async function handleAdd() {
  if (!newCatName.value) return;
  await categoryStore.addCategory({ 
    name: newCatName.value, 
    color: newCatColor.value 
  });
  newCatName.value = '';
}
</script>

<template>
  <div class="category-manager">
    <h3>Categorias</h3>
    
    <div class="tags-container">
      <div 
        v-for="cat in categoryStore.list" 
        :key="cat.id" 
        class="tag"
        :style="{ backgroundColor: cat.color + '20', color: cat.color, borderColor: cat.color }"
      >
        <span class="dot" :style="{ backgroundColor: cat.color }"></span>
        {{ cat.name }}
      </div>
      
      <div v-if="categoryStore.list.length === 0" class="empty-state">
        Nenhuma categoria criada.
      </div>
    </div>

    <div class="add-form">
      <input 
        v-model="newCatName" 
        placeholder="Nova categoria (ex: Lazer)"
        @keyup.enter="handleAdd"
      />
      <input 
        type="color" 
        v-model="newCatColor" 
        class="color-picker"
      />
      <button @click="handleAdd">+</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.category-manager {
  background: #1e293b;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #334155;

  h3 { margin-top: 20px; color: #94a3b8; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; }
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 1.5rem;

  .tag {
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    border: 1px solid transparent;
    display: flex;
    align-items: center;
    gap: 8px;

    .dot { width: 8px; height: 8px; border-radius: 50%; }
  }
  
  .empty-state { color: #64748b; font-size: 0.9rem; font-style: italic; }
}

.add-form {
  display: flex;
  gap: 10px;

  input[type="text"] {
    flex: 1;
    background: #0f172a;
    border: 1px solid #334155;
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    &:focus { outline: 2px solid #3b82f6; border-color: transparent; }
  }

  .color-picker {
    background: none;
    border: none;
    width: 40px;
    height: 40px;
    cursor: pointer;
  }

  button {
    background: #3b82f6;
    color: white;
    border: none;
    width: 40px;
    border-radius: 6px;
    font-size: 1.2rem;
    cursor: pointer;
    &:hover { background: #2563eb; }
  }
}
</style>