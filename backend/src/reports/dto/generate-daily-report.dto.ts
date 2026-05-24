import { IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateDailyReportDto {
  @ApiProperty({ example: '2026-05-24', description: 'Date to generate report for (YYYY-MM-DD)' })
  @IsDateString()
  date: string;
}
