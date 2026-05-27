import { IsNotEmpty, IsString, IsOptional, IsDateString, IsJSON, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMenuDto {
  @ApiProperty({ description: 'Date of the meal menu (YYYY-MM-DD)', example: '2026-05-27' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Meal type', enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] })
  @IsString()
  @IsIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'breakfast', 'lunch', 'dinner', 'snack'])
  @IsNotEmpty()
  meal: string;

  @ApiProperty({
    description: 'JSON array of menu item strings, e.g. ["Idli","Sambar","Chutney"]',
    example: '["Idli","Sambar","Chutney"]',
  })
  @IsJSON()
  @IsNotEmpty()
  items: string;

  @ApiProperty({ description: 'Optional preparation or serving notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
