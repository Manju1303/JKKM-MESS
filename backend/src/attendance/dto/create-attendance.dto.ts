import { IsString, IsNotEmpty, IsInt, Min, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAttendanceDto {
  @ApiProperty({ example: '2026-05-24T00:00:00.000Z', description: 'Date of attendance' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: 'LUNCH', enum: ['BREAKFAST', 'LUNCH', 'DINNER'] })
  @IsString()
  @IsIn(['BREAKFAST', 'LUNCH', 'DINNER'])
  meal: string;

  @ApiProperty({ example: 450, description: 'Student count' })
  @IsInt()
  @Min(0)
  count: number;

  @ApiProperty({ required: false, example: 'Hostel A', description: 'Hostel name' })
  @IsOptional()
  @IsString()
  hostel?: string;

  @ApiProperty({ required: false, example: 'Normal attendance', description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
