import { IsIn, IsString } from "class-validator";
import {
  submissionCodeLanguageValues,
  submissionEditorTypeValues,
} from "../assignment.types";

export class UpsertAssignmentTemplateDto {
  @IsIn(submissionEditorTypeValues)
  editorType!: (typeof submissionEditorTypeValues)[number];

  @IsIn(submissionCodeLanguageValues)
  codeLanguage!: (typeof submissionCodeLanguageValues)[number];

  @IsString()
  title!: string;

  @IsString()
  content!: string;

  @IsString()
  actorId!: string;

  @IsString()
  actorName!: string;
}
