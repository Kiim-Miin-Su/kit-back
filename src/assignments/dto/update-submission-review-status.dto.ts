import { IsIn, IsOptional, IsString } from "class-validator";
import { submissionReviewStatusValues } from "../assignment.types";

export class UpdateSubmissionReviewStatusDto {
  @IsIn(submissionReviewStatusValues)
  reviewStatus!: (typeof submissionReviewStatusValues)[number];

  @IsOptional()
  @IsString()
  comment?: string;
}
