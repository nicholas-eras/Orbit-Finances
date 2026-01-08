import { Module } from '@nestjs/common';
import { RecurrencesService } from './recurrences.service';
import { RecurrencesController } from './recurrences.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [RecurrencesController],
  providers: [RecurrencesService, PrismaService],
})
export class RecurrencesModule {}
