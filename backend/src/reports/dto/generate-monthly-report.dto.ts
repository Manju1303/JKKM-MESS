import { IsInt, Min, Max } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GenerateMonthlyReportDto {
  @ApiProperty({ example: 2026, description: "Year of report" })
  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 5, description: "Month of report (1-12)" })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;
}
