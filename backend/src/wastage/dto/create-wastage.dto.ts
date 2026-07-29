import {
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
  IsIn,
  Min,
  IsInt,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateWastageDto {
  @ApiProperty({ example: 1, description: "Product ID" })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({ example: 5.5, description: "Quantity wasted" })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: "KG", description: "Unit of measure" })
  @IsString()
  unit: string;

  @ApiProperty({
    example: "EXPIRED",
    enum: ["EXPIRED", "DAMAGED", "OVERCOOK", "OTHER"],
    description: "Reason for wastage",
  })
  @IsIn(["EXPIRED", "DAMAGED", "OVERCOOK", "OTHER"])
  reason: string;

  @ApiProperty({
    example: "2026-05-24T10:00:00Z",
    description: "When wastage was reported",
  })
  @IsDateString()
  reportedAt: string;

  @ApiProperty({
    required: false,
    example: "Rice overcooked during dinner prep",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
