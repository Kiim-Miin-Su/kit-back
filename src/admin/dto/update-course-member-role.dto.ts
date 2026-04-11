import { IsIn } from "class-validator";
import { adminCourseMemberRoleValues } from "../admin.types";

export class UpdateCourseMemberRoleDto {
  @IsIn(adminCourseMemberRoleValues)
  role!: (typeof adminCourseMemberRoleValues)[number];
}
