import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { AuthGuard } from "../auth/auth.guard";
import { AssignmentsService } from "./assignments.service";
import { CreateStudentSubmissionDto } from "./dto/create-student-submission.dto";

@ApiTags("assignments / student")
@ApiBearerAuth("access-token")
@Controller("me/assignments")
@UseGuards(AuthGuard)
export class MeAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get("workspace")
  @ApiOperation({ summary: "내 과제 워크스페이스" })
  getWorkspace(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.assignmentsService.getStudentWorkspace(user);
  }

  @Post("submissions")
  @ApiOperation({ summary: "과제 제출" })
  createSubmission(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateStudentSubmissionDto,
  ) {
    return this.assignmentsService.createStudentSubmission(user, body);
  }
}
