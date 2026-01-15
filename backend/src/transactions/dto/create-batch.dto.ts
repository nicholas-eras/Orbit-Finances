import { IsArray, IsDateString, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TransactionItemDto {
  @IsString()
  description: string;

  @IsNumber()
  amount: number; // O front manda number, o Prisma converte pra Decimal

  @IsDateString()
  date: string; // ISO 8601 (YYYY-MM-DD)

  @IsString()
  type: 'INCOME' | 'EXPENSE';

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}

export class CreateBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionItemDto)
  transactions: TransactionItemDto[];

  @IsOptional()
  @IsNumber()
  bankBalance?: number;
}