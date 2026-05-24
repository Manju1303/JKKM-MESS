import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Vegetables', description: 'Name of the product category' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['PACKAGED', 'VEGETABLE', 'BULK'], description: 'Type of products in category' })
  @IsEnum(['PACKAGED', 'VEGETABLE', 'BULK'])
  type: string;

  @ApiProperty({ required: false, example: 'Fresh farm vegetables daily delivery', description: 'Description of category' })
  @IsOptional()
  @IsString()
  description?: string;
}
