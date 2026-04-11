import { Type } from "class-transformer";
import { IsInt, IsString, Min } from "class-validator";

export class SubmissionAttachmentDto {
  @IsString()
  id!: string;

  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  sizeBytes!: number;
}
