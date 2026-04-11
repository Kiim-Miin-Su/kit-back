import { Controller, Get, Param } from "@nestjs/common";
import { AssignmentsService } from "./assignments.service";

@Controller("submissions")
export class SubmissionsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get(":submissionId")
  getSubmissionDetail(@Param("submissionId") submissionId: string) {
    return this.assignmentsService.getSubmissionDetail(submissionId);
  }
}
