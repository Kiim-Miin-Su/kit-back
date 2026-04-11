import { Type } from "class-transformer";
import { IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";
import {
  submissionCodeLanguageValues,
  submissionEditorTypeValues,
} from "../assignment.types";

class InitialAssignmentTemplateDto {
  @IsIn(submissionEditorTypeValues)
  editorType!: (typeof submissionEditorTypeValues)[number];

  @IsIn(submissionCodeLanguageValues)
  codeLanguage!: (typeof submissionCodeLanguageValues)[number];

  @IsString()
  title!: string;

  @IsString()
  content!: string;
}

export class CreateInstructorAssignmentDto {
  @IsString()
  courseId!: string;

  @IsString()
  courseTitle!: string;

  @IsString()
  title!: string;

  @IsString()
  prompt!: string;

  @IsString()
  dueAt!: string;

  @IsBoolean()
  allowFileUpload!: boolean;

  @IsBoolean()
  allowCodeEditor!: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => InitialAssignmentTemplateDto)
  initialTemplate?: InitialAssignmentTemplateDto;
}
