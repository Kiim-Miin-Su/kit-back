import { IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateEnrollmentDto {
  @ApiProperty({ description: "수강 신청할 강좌 ID" })
  @IsString()
  @MinLength(1)
  courseId!: string;
}
