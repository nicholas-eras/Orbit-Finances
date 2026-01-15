import { Controller, Get, Post, Body, UseGuards, Req, Delete, Param, Patch } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('categories')
@UseGuards(AuthGuard('jwt'))
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Req() req, @Body() createCategoryDto: { name: string; color: string; icon?: string }) {
    return this.categoriesService.create(req.user.id, createCategoryDto);
  }

  @Get()
  findAll(@Req() req) {
    return this.categoriesService.findAll(req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.categoriesService.remove(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string, 
    @Req() req, 
    @Body() updateCategoryDto: { name?: string; color?: string; icon?: string }
  ) {   
    return this.categoriesService.update(id, req.user.id, updateCategoryDto);
  }
}