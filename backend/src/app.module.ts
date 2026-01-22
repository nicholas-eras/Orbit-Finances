import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { RecurrencesModule } from './recurrences/recurrences.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({isGlobal: true}),
    CategoriesModule,
    TransactionsModule,
    RecurrencesModule,
    AnalyticsModule,
    UsersModule,
    ScheduleModule.forRoot()
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
