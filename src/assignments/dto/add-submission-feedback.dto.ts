import { Type } from "class-transformer";
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";
import {
  submissionCodeLanguageValues,
  submissionFeedbackEntryTypeValues,
  submissionMessageFormatValues,
  submissionReviewStatusValues,
} from "../assignment.types";
import { SubmissionAttachmentDto } from "./submission-shared.dto";

export class AddSubmissionFeedbackDto {
  @IsOptional()
  @IsIn(submissionMessageFormatValues)
  messageFormat?: (typeof submissionMessageFormatValues)[number];

  @IsOptional()
  @IsIn(submissionFeedbackEntryTypeValues)
  entryType?: (typeof submissionFeedbackEntryTypeValues)[number];

  @IsString()
  message!: string;

  @IsString()
  code!: string;

  @IsIn(submissionCodeLanguageValues)
  codeLanguage!: (typeof submissionCodeLanguageValues)[number];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmissionAttachmentDto)
  attachments!: SubmissionAttachmentDto[];

  @IsOptional()
  @IsIn(submissionReviewStatusValues)
  reviewStatus?: (typeof submissionReviewStatusValues)[number];
}
