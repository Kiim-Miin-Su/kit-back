import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { AuthGuard } from "../auth/auth.guard";
import { AssignmentsService } from "./assignments.service";

@ApiTags("assignments / student")
@ApiBearerAuth("access-token")
@Controller("submissions")
@UseGuards(AuthGuard)
export class SubmissionsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get(":submissionId")
  @ApiOperation({ summary: "제출 상세 조회" })
  getSubmissionDetail(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("submissionId") submissionId: string,
  ) {
    return this.assignmentsService.getSubmissionDetail(submissionId, user);
  }
}
