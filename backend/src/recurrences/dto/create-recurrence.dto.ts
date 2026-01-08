export class CreateRecurrenceDto {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;      // Ex: 1 para "Todo mês", 2 para "A cada 2 meses"
  startDate: string;     
  endDate?: string;      
  amount: number;        
  description: string;
  type: 'EXPENSE' | 'INCOME';
  categoryId?: string;
}