import { IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateBalanceDto {
  @IsNotEmpty()
  @IsNumber()
  balance: number;
}