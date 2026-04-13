import { IsOptional, IsString, Matches, MinLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "홍길동" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  userName?: string;

  @ApiPropertyOptional({ example: "1990-01-15", description: "YYYY-MM-DD 형식" })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate?: string;

  @ApiPropertyOptional({ example: "풀스택 개발자" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;
}
