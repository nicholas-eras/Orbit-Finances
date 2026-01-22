import { api } from './api'; // Importando o SEU wrapper

export async function updateBankBalance(balance) {
  return api('/users/balance', { 
    method: 'PATCH',
    // O seu wrapper espera 'body' e ele mesmo faz o JSON.stringify
    body: { 
      balance: Number(balance) 
    }
  });
}