import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: { name: string; color: string; icon?: string }) {
    const existing = await this.prisma.category.findFirst({
      where: { userId, name: data.name }
    });
    
    if (existing) return existing;

    return this.prisma.category.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' }
    });
  }
}