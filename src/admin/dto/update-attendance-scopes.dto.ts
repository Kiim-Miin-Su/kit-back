import { IsArray, IsString } from "class-validator";

export class UpdateAttendanceScopesDto {
  @IsArray()
  @IsString({ each: true })
  allowedScheduleScopes!: string[];
}
