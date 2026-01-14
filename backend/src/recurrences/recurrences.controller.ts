import { Controller, Get, Post, Body, UseGuards, Req, Delete, Param } from '@nestjs/common';
import { RecurrencesService } from './recurrences.service';
import { CreateRecurrenceDto } from './dto/create-recurrence.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('recurrences')
@UseGuards(AuthGuard('jwt'))
export class RecurrencesController {
  constructor(private readonly recurrencesService: RecurrencesService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateRecurrenceDto) {
    return this.recurrencesService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Req() req) {
    return this.recurrencesService.findAll(req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.recurrencesService.remove(id, req.user.id);
  }
}