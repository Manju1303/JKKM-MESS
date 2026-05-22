import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  productId: number;

  @ApiProperty({ required: false, example: 'BATCH-2024-001' })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 'KG' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 45.5, description: 'Cost per unit in INR' })
  @IsNumber()
  costPerUnit: number;

  @ApiProperty({ required: false, example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ required: false, example: '2024-06-01' })
  @IsOptional()
  @IsDateString()
  manufacturingDate?: string;

  @ApiProperty({ required: false, example: 'Cold Storage - A' })
  @IsOptional()
  @IsString()
  location?: string;
}
