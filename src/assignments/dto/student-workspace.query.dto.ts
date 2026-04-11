import { IsOptional, IsString } from "class-validator";

export class StudentWorkspaceQueryDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  studentName?: string;
}
