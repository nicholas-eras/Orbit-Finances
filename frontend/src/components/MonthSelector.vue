<script setup lang="ts">
import { computed } from 'vue';

// Recebe a data atual do pai e emite evento quando mudar
const props = defineProps<{ modelValue: Date }>();
const emit = defineEmits(['update:modelValue']);

// Formata para "Janeiro 2026"
const label = computed(() => {
  return props.modelValue.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
});

// Lógica de navegar
const changeMonth = (offset: number) => {
  const newDate = new Date(props.modelValue);
  newDate.setMonth(newDate.getMonth() + offset);
  emit('update:modelValue', newDate);
};
</script>

<template>
  <div class="month-selector">
    <button @click="changeMonth(-1)">&lt;</button>
    <span>{{ label }}</span>
    <button @click="changeMonth(1)">&gt;</button>
  </div>
</template>

<style scoped lang="scss">
.month-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: #1e293b;
  padding: 10px 20px;
  border-radius: 30px; // Redondinho
  border: 1px solid #334155;
  margin-bottom: 20px;
  user-select: none;

  span {
    font-weight: bold;
    color: white;
    text-transform: capitalize;
    min-width: 150px;
    text-align: center;
  }

  button {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 5px 10px;
    transition: color 0.2s;
    
    &:hover { color: white; }
  }
}
</style>