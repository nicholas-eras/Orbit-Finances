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

export async function deleteTransaction(id) {
  return api(`/transactions/${id}`, { method: 'DELETE' });
}

/**
 * Cria múltiplas transações de uma vez (Importação em Lote)
 * @param {Object} batchData
 * @param {Array<Object>} batchData.transactions - Array de objetos de transação
 */
export async function createBatchTransactions(batchData) {
  // Validação básica para garantir que estamos enviando o formato correto esperado pelo DTO do NestJS
  if (!batchData || !batchData.transactions || !Array.isArray(batchData.transactions)) {
    throw new Error('Formato inválido: é necessário enviar um objeto com um array de "transactions".');
  }

  if (batchData.transactions.length === 0) {
    throw new Error('O array de transações está vazio.');
  }

  return api('/transactions/batch', {
    method: 'POST',
    body: batchData,
  });
}

export async function updateTransaction(id, transactionData) {
  return api(`/transactions/${id}`, {
    method: 'PATCH',
    body: transactionData,
  });
}