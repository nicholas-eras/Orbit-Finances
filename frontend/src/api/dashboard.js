import { api } from './api'; 

export async function getDashboardAnalytics(month, year) {
  const params = new URLSearchParams({ month, year });
  return api(`/analytics/dashboard?${params.toString()}`, { method: 'GET' });
}