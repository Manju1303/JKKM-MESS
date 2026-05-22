import { IsEmail, IsString, MinLength, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'Karthik Rajan' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'karthik@jkkm.edu.in' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ required: false, example: '9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 2, description: 'Role ID' })
  @IsNumber()
  roleId: number;
}
