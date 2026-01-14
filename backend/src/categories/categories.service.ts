import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: { name: string; color: string; icon?: string }) {
    try {
      const category = await this.prisma.category.create({
        data: {
          ...data,
          userId,
        },
      });
      return {
        message: 'Categoria criada com sucesso!',
        category,
      };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        // Já existe
        throw new BadRequestException(`A categoria "${data.name}" já existe.`);
      }
      throw e; // outros erros
    }
  }

  async findAll(userId: string) {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  // ======================================================
  // NOVO: REMOVER CATEGORIA
  // ======================================================
  async remove(id: string, userId: string) {
    // Verifica se a categoria pertence ao usuário antes de deletar
    const result = await this.prisma.category.deleteMany({
      where: {
        id: id,
        userId: userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    return { message: 'Categoria removida com sucesso' };
  }
}
