import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { AssignmentsService } from "./assignments.service";
import { CreateStudentSubmissionDto } from "./dto/create-student-submission.dto";

@ApiTags("me / assignments")
@ApiBearerAuth("access-token")
@Controller("me/assignments")
@UseGuards(AuthGuard)
export class MeAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get("workspace")
  @ApiOperation({ summary: "나의 과제 워크스페이스 조회", description: "수강 중인 강의의 과제 목록과 제출 이력을 반환합니다." })
  @ApiResponse({ status: 200, description: "과제 워크스페이스 반환" })
  getWorkspace(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.assignmentsService.getStudentWorkspace(user);
  }

  @Post("submissions")
  @ApiOperation({ summary: "과제 제출", description: "수강 중인 강의의 과제에 코드/노트를 제출합니다." })
  @ApiResponse({ status: 201, description: "제출된 submission 반환" })
  @ApiResponse({ status: 400, description: "미수강 강의(NOT_ENROLLED_COURSE), 첨부 파일 없음/미완료/타인 파일, 빈 제출(INVALID_SUBMISSION)" })
  createSubmission(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateStudentSubmissionDto,
  ) {
    return this.assignmentsService.createStudentSubmission({
      ...body,
      studentId: user.userId,
      studentName: user.name,
    });
  }
}
