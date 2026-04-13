import { IsString, Length, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CheckInDto {
  @ApiProperty({ description: "출석 체크할 스케줄 ID" })
  @IsString()
  @MinLength(1)
  scheduleId!: string;

  @ApiProperty({ description: "6자리 출석 코드", minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6)
  code!: string;
}
