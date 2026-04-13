import { IsEmail, IsOptional, IsString, Matches, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateUserDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "password123", minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: "홍길동" })
  @IsString()
  @MinLength(1)
  userName!: string;

  @ApiPropertyOptional({ example: "1990-01-15", description: "YYYY-MM-DD 형식" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate?: string;
}
