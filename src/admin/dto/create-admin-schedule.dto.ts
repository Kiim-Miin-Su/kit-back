import { IsBoolean, IsIn, IsOptional, IsString, Matches } from "class-validator";
import { adminScheduleVisibilityTypeValues } from "../admin.types";
import { DATE_KEY_REGEX } from "../admin.validation";

class BaseAdminScheduleDto {
  @IsString()
  title!: string;

  @IsString()
  categoryLabel!: string;

  @Matches(DATE_KEY_REGEX)
  dateKey!: string;

  @IsString()
  timeLabel!: string;

  @IsString()
  locationLabel!: string;

  @IsIn(adminScheduleVisibilityTypeValues)
  visibilityType!: (typeof adminScheduleVisibilityTypeValues)[number];

  @IsString()
  visibilityScope!: string;

  @IsString()
  visibilityLabel!: string;

  @IsBoolean()
  requiresAttendanceCheck!: boolean;

  @IsOptional()
  @IsString()
  attendanceWindowStartAt?: string;

  @IsOptional()
  @IsString()
  attendanceWindowEndAt?: string;
}

export class CreateAdminScheduleDto extends BaseAdminScheduleDto {}

export class UpdateAdminScheduleDto extends BaseAdminScheduleDto {}
