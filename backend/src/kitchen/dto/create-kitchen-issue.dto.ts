import {
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
  IsIn,
  Min,
  IsInt,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateKitchenIssueDto {
  @ApiProperty({ example: '2026-05-24', description: 'Date of issue (YYYY-MM-DD)' })
  @IsDateString()
  issueDate: string;

  @ApiProperty({ example: 1, description: 'Product ID to issue' })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ example: 10.5, description: 'Quantity to issue' })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 'KG', description: 'Unit of measure' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 'LUNCH', enum: ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] })
  @IsIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'])
  meal: string;

  @ApiProperty({ required: false, example: 450, description: 'Headcount for the meal' })
  @IsOptional()
  @IsInt()
  @Min(0)
  headcount?: number;

  @ApiProperty({ required: false, example: 'Issued for afternoon lunch batch' })
  @IsOptional()
  @IsString()
  notes?: string;
}
