import { IsString, IsOptional, IsEmail, IsPhoneNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Sri Balaji Traders' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, example: 'Raju Kumar' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiProperty({ example: '9876543210', description: 'Primary contact phone number' })
  @IsString()
  phone: string;

  @ApiProperty({ required: false, example: 'supplier@balaji.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, example: '12, Market Road, Erode, TN - 638001' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, example: '33AAAPS1234B1Z5', description: 'GST registration number' })
  @IsOptional()
  @IsString()
  gstNumber?: string;

  @ApiProperty({ required: false, example: 'AAAPS1234B', description: 'PAN card number' })
  @IsOptional()
  @IsString()
  panNumber?: string;

  @ApiProperty({ required: false, example: '1234567890123456', description: 'Bank account number' })
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiProperty({ required: false, example: 'SBIN0001234', description: 'Bank IFSC code' })
  @IsOptional()
  @IsString()
  bankIfsc?: string;
}
