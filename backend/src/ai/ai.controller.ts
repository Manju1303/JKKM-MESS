import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Get('insights')
  @ApiOperation({ summary: 'Get AI-powered insights summary for dashboard' })
  getInsights() {
    return this.aiService.getInsights();
  }

  @Get('predictions')
  @ApiOperation({ summary: 'Get 7-day stock requirement predictions' })
  getPredictions() {
    return this.aiService.predictStockRequirement();
  }

  @Get('reorder-suggestions')
  @ApiOperation({ summary: 'Get smart reorder suggestions for low stock items' })
  getReorderSuggestions() {
    return this.aiService.getReorderSuggestions();
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'Detect unusual spending patterns' })
  getAnomalies() {
    return this.aiService.detectSpendingAnomalies();
  }
}
