import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('transactions')
@UseGuards(AuthGuard('jwt'))
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Req() req, @Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(req.user.id, createTransactionDto);
  }

  @Get()
  findAll(
    @Req() req, 
    @Query('month') month?: string, // Recebe como string da URL
    @Query('year') year?: string
  ) {
    // Converte para number antes de mandar pro service
    const m = month ? parseInt(month) : undefined;
    const y = year ? parseInt(year) : undefined;
    
    return this.transactionsService.findAll(req.user.id, m, y);
  }
}