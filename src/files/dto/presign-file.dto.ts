import { Type } from "class-transformer";
import { IsInt, IsString, Max, Min } from "class-validator";
import { FILE_MAX_SIZE_BYTES } from "../files.types";

export class PresignFileDto {
  @IsString()
  ownerId!: string;

  @IsString()
  fileName!: string;

  @IsString()
  contentType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(FILE_MAX_SIZE_BYTES)
  size!: number;

  @IsString()
  checksum!: string;
}
