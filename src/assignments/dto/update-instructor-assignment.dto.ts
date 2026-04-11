import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateInstructorAssignmentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  prompt?: string;

  @IsOptional()
  @IsString()
  dueAt?: string;

  @IsOptional()
  @IsBoolean()
  allowFileUpload?: boolean;

  @IsOptional()
  @IsBoolean()
  allowCodeEditor?: boolean;

  @IsString()
  actorId!: string;

  @IsString()
  actorName!: string;
}
