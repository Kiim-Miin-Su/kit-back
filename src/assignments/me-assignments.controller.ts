import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { AuthenticatedRequestUser } from "../auth/auth.types";
import { AuthGuard } from "../auth/auth.guard";
import { AssignmentsService } from "./assignments.service";
import { CreateStudentSubmissionDto } from "./dto/create-student-submission.dto";

@Controller("me/assignments")
@UseGuards(AuthGuard)
export class MeAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get("workspace")
  getWorkspace(@CurrentUser() user: AuthenticatedRequestUser) {
    return this.assignmentsService.getStudentWorkspace(user);
  }

  @Post("submissions")
  createSubmission(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateStudentSubmissionDto,
  ) {
    return this.assignmentsService.createStudentSubmission(user, body);
  }
}
