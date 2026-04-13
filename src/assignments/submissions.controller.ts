import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { AssignmentsService } from "./assignments.service";

@ApiTags("submissions")
@ApiBearerAuth("access-token")
@Controller("submissions")
@UseGuards(AuthGuard)
export class SubmissionsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get(":submissionId")
  @ApiOperation({ summary: "제출 상세 조회 (revisionHistory + timeline 포함)" })
  @ApiResponse({ status: 200, description: "제출 상세 데이터 반환" })
  @ApiResponse({ status: 404, description: "제출 없음 (SUBMISSION_NOT_FOUND)" })
  getSubmissionDetail(@Param("submissionId") submissionId: string) {
    return this.assignmentsService.getSubmissionDetail(submissionId);
  }
}
