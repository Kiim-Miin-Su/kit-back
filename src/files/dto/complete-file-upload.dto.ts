import { Type } from "class-transformer";
import { IsInt, IsString, Max, Min } from "class-validator";
import { FILE_MAX_SIZE_BYTES } from "../files.types";

export class CompleteFileUploadDto {
  @IsString()
  fileId!: string;

  @IsString()
  checksum!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(FILE_MAX_SIZE_BYTES)
  size!: number;
}
