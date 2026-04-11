import { IsString, MinLength } from "class-validator";

export class CreateEnrollmentDto {
  @IsString()
  @MinLength(1)
  courseId!: string;
}
