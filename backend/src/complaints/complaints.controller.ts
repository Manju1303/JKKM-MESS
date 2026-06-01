import {
  Controller, Get, Post, Param, Body, UseGuards, Request, ParseIntPipe
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Complaints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'HOSTEL_WARDEN', 'STUDENT_VIEWER')
  @ApiOperation({ summary: 'Get complaints (Warden/Admin gets all, Student gets only own)' })
  findAll(@Request() req: any) {
    const { userId, role } = req.user;
    if (role === 'STUDENT_VIEWER') {
      return this.complaintsService.findByStudent(userId);
    }
    return this.complaintsService.findAll();
  }

  @Post()
  @Roles('STUDENT_VIEWER')
  @ApiOperation({ summary: 'Submit a new complaint (Student only)' })
  create(@Body() dto: CreateComplaintDto, @Request() req: any) {
    return this.complaintsService.create(dto, req.user.userId, req.user.name);
  }

  @Post(':id/resolve')
  @Roles('SUPER_ADMIN', 'HOSTEL_WARDEN')
  @ApiOperation({ summary: 'Mark complaint as RESOLVED (Warden/Admin only)' })
  resolve(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.complaintsService.resolve(id, req.user.userId);
  }
}
