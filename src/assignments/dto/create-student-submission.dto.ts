import { Type } from "class-transformer";
import { IsArray, IsIn, IsString, ValidateNested } from "class-validator";
import {
  submissionCodeLanguageValues,
  submissionEditorTypeValues,
} from "../assignment.types";
import { SubmissionAttachmentDto } from "./submission-shared.dto";

export class CreateStudentSubmissionDto {
  @IsString()
  studentId!: string;

  @IsString()
  studentName!: string;

  @IsString()
  assignmentId!: string;

  @IsIn(submissionEditorTypeValues)
  editorType!: (typeof submissionEditorTypeValues)[number];

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

  @IsArray()
  @IsString({ each: true })
  enrolledCourseIds!: string[];
}
