export class CreateTransactionDto {
  amount: number;       
  date: string;         
  description: string;
  categoryId?: string; 
  type: 'EXPENSE' | 'INCOME';
  isPaid?: boolean;
}