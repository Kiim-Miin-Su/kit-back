import { IsString, Length, MinLength } from "class-validator";

export class CheckInDto {
  @IsString()
  @MinLength(1)
  scheduleId!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
