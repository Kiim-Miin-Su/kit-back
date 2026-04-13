import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { AuthGuard } from "../auth/auth.guard";
import { AssignmentsService } from "./assignments.service";

@Controller("submissions")
@UseGuards(AuthGuard)
export class SubmissionsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get(":submissionId")
  getSubmissionDetail(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("submissionId") submissionId: string,
  ) {
    return this.assignmentsService.getSubmissionDetail(submissionId, user);
  }
}
