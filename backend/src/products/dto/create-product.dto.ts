import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateProductDto {
  @ApiProperty({ example: "Rice (Ponni)" })
  @IsString()
  name: string;

  @ApiProperty({ required: false, example: "RICE-001" })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ required: false, example: "8901234567890" })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 1, description: "Category ID" })
  @IsNumber()
  categoryId: number;

  @ApiProperty({ enum: ["PACKAGED", "VEGETABLE", "BULK"] })
  @IsEnum(["PACKAGED", "VEGETABLE", "BULK"])
  type: string;

  @ApiProperty({ example: "KG", description: "Unit of measurement" })
  @IsString()
  unit: string;

  @ApiProperty({
    required: false,
    example: 25,
    description: "Package size in units",
  })
  @IsOptional()
  @IsNumber()
  unitSize?: number;

  @ApiProperty({
    required: false,
    example: 50,
    description: "Minimum stock level trigger",
  })
  @IsOptional()
  @IsNumber()
  minStockLevel?: number;

  @ApiProperty({ required: false, example: 500 })
  @IsOptional()
  @IsNumber()
  maxStockLevel?: number;

  @ApiProperty({
    required: false,
    example: true,
    description: "Is the product active",
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
