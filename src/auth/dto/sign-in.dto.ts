import { IsEmail, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SignInDto {
  @ApiProperty({ example: "student-demo-01@koreait.academy" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "password123", minLength: 4 })
  @IsString()
  @MinLength(4)
  password!: string;
}
