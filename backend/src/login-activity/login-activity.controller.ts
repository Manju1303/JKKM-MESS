import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LoginActivityService } from './login-activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Login Activity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('login-activity')
export class LoginActivityController {
  constructor(private readonly loginActivityService: LoginActivityService) {}

  @Get()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all login activities (Super Admin only)' })
  findAll(@Query('email') email?: string) {
    if (email) {
      return this.loginActivityService.findByEmail(email);
    }
    return this.loginActivityService.findAll();
  }
}
