import {
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  IsInt,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class PurchaseItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: "KG" })
  @IsString()
  unit: string;

  @ApiProperty({ example: 55.5 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 2775.0 })
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @ApiProperty({ required: false, example: 5, description: "GST percentage" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gstPercent?: number;

  @ApiProperty({ required: false, example: "BATCH-2026-001" })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiProperty({ required: false, example: "2027-01-01" })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class CreatePurchaseDto {
  @ApiProperty({ example: 1, description: "Supplier ID" })
  @IsInt()
  @Min(1)
  supplierId: number;

  @ApiProperty({ example: "2026-05-24", description: "Purchase date" })
  @IsDateString()
  purchaseDate: string;

  @ApiProperty({ example: 5250.0, description: "Total amount before GST" })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ required: false, example: 262.5, description: "GST amount" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  gstAmount?: number;

  @ApiProperty({
    example: 5512.5,
    description: "Final net amount including GST",
  })
  @IsNumber()
  @Min(0)
  netAmount: number;

  @ApiProperty({ required: false, example: "INV-2026-1234" })
  @IsOptional()
  @IsString()
  billNumber?: string;

  @ApiProperty({ required: false, example: "Urgent order for festival season" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseItemDto], description: "Line items" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}
