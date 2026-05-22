import { IsEmail, IsString, MinLength, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'john@jkkm.edu.in' })
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

  @ApiProperty({ example: 1, description: 'Role ID from /users/roles' })
  @IsNumber()
  roleId: number;
}
