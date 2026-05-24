import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, ParseIntPipe, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Menu')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @ApiOperation({ summary: 'Get all menu items or filter by date range' })
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (startDate && endDate) {
      return this.menuService.findByDateRange(startDate, endDate);
    }
    return this.menuService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get menu item by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findOne(id);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'MESS_MANAGER')
  @ApiOperation({ summary: 'Create a new menu plan (Manager/Admin only)' })
  create(@Body() dto: CreateMenuDto) {
    return this.menuService.create(dto);
  }

  @Put(':id')
  @Roles('SUPER_ADMIN', 'MESS_MANAGER')
  @ApiOperation({ summary: 'Update an existing menu plan (Manager/Admin only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateMenuDto,
  ) {
    return this.menuService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'MESS_MANAGER')
  @ApiOperation({ summary: 'Delete a menu plan (Manager/Admin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.remove(id);
  }
}
