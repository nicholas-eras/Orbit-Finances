// services/transactionsApi.js
import { api } from './api';

/**
 * Cria uma nova transação
 * @param {Object} transactionData
 * @param {number} transactionData.amount
 * @param {string} transactionData.date - ISO string
 * @param {string} transactionData.description
 * @param {'EXPENSE'|'INCOME'} transactionData.type
 * @param {string} [transactionData.categoryId]
 * @param {boolean} [transactionData.isPaid]
 */
export async function createTransaction(transactionData) {
  if (!transactionData.amount || !transactionData.date || !transactionData.description || !transactionData.type) {
    throw new Error('Campos obrigatórios faltando para criar transação.');
  }

  return api('/transactions', {
    method: 'POST',
    body: transactionData,
  });
}

/**
 * Lista transações do usuário, opcionalmente filtrando por mês e ano
 * @param {string} [month] - 1 a 12
 * @param {string} [year]
 */
export async function getTransactions(month, year) {
  const params = new URLSearchParams();
  if (month) params.append('month', month);
  if (year) params.append('year', year);

  const queryString = params.toString() ? `?${params.toString()}` : '';
  return api(`/transactions${queryString}`, { method: 'GET' });
}

/**
 * Retorna despesas por categoria entre datas
 * @param {Object} dto
 * @param {string} dto.startDate
 * @param {string} dto.endDate
 */
export async function getExpensesByCategory(dto) {
  if (!dto.startDate || !dto.endDate) {
    throw new Error('startDate e endDate são obrigatórios');
  }

  const params = new URLSearchParams(dto).toString();
  return api(`/transactions/expenses-by-category?${params}`, { method: 'GET' });
}

/**
 * Retorna dados de gráfico de barras para dashboard
 * @param {Object} dto
 * @param {string} dto.startDate
 * @param {string} dto.endDate
 */
export async function getBarChartData(dto) {
  if (!dto.startDate || !dto.endDate) {
    throw new Error('startDate e endDate são obrigatórios');
  }

  const params = new URLSearchParams(dto).toString();
  return api(`/transactions/bar-chart?${params}`, { method: 'GET' });
}
