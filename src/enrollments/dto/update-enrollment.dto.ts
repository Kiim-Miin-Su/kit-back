import { IsIn } from "class-validator";
import { enrollmentStatusValues } from "../enrollments.types";

export class UpdateEnrollmentDto {
  @IsIn(enrollmentStatusValues)
  status!: (typeof enrollmentStatusValues)[number];
}
