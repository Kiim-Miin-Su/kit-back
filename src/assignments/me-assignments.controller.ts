import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { AssignmentsService } from "./assignments.service";
import { CreateStudentSubmissionDto } from "./dto/create-student-submission.dto";
import { StudentWorkspaceQueryDto } from "./dto/student-workspace.query.dto";

@Controller("me/assignments")
export class MeAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get("workspace")
  getWorkspace(@Query() query: StudentWorkspaceQueryDto) {
    return this.assignmentsService.getStudentWorkspace(query.studentId, query.studentName);
  }

  @Post("submissions")
  createSubmission(@Body() body: CreateStudentSubmissionDto) {
    return this.assignmentsService.createStudentSubmission(body);
  }
}
