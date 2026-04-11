import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Matches, Min } from "class-validator";
import { adminCoursePacingTypeValues } from "../admin.types";
import { DATE_KEY_REGEX } from "../admin.validation";

export class CreateAdminCourseDto {
  @IsString()
  courseTitle!: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  sectionLabel?: string;

  @IsOptional()
  @IsString()
  roomLabel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number;

  @Matches(DATE_KEY_REGEX)
  startDate!: string;

  @Matches(DATE_KEY_REGEX)
  endDate!: string;

  @Matches(DATE_KEY_REGEX)
  enrollmentStartDate!: string;

  @Matches(DATE_KEY_REGEX)
  enrollmentEndDate!: string;

  @IsIn(adminCoursePacingTypeValues)
  pacingType!: (typeof adminCoursePacingTypeValues)[number];
}
