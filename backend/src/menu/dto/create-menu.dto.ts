import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMenuDto {
  @ApiProperty({ description: 'Date of the meal menu' })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ description: 'Meal type, e.g. BREAKFAST, LUNCH, DINNER, SNACK' })
  @IsString()
  @IsNotEmpty()
  meal: string;

  @ApiProperty({ description: 'JSON string or string containing list of menu items' })
  @IsString()
  @IsNotEmpty()
  items: string;

  @ApiProperty({ description: 'Optional helper notes for preparation or notes', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
