// services/recurrencesApi.js
import { api } from './api';

/**
 * Cria uma nova recorrência.
 * @param {Object} recurrenceData
 * @param {'DAILY'|'WEEKLY'|'MONTHLY'|'YEARLY'} recurrenceData.frequency
 * @param {number} recurrenceData.interval
 * @param {string} recurrenceData.startDate ISO string
 * @param {string} [recurrenceData.endDate] ISO string
 * @param {number} recurrenceData.amount
 * @param {string} recurrenceData.description
 * @param {'EXPENSE'|'INCOME'} recurrenceData.type
 * @param {string} [recurrenceData.categoryId]
 */
export async function createRecurrence(recurrenceData) {
  if (!recurrenceData.frequency || !recurrenceData.interval || !recurrenceData.startDate || !recurrenceData.amount || !recurrenceData.description || !recurrenceData.type) {
    throw new Error('Dados obrigatórios incompletos para criar recorrência.');
  }

  return api('/recurrences', {
    method: 'POST',
    body: recurrenceData,
  });
}

/**
 * Retorna todas as recorrências do usuário logado.
 */
export async function getRecurrences() {
  return api('/recurrences', { method: 'GET' });
}
