import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AssignmentsService } from "./assignments.service";
import { AddSubmissionFeedbackDto } from "./dto/add-submission-feedback.dto";
import { CreateInstructorAssignmentDto } from "./dto/create-instructor-assignment.dto";
import { UpdateInstructorAssignmentDto } from "./dto/update-instructor-assignment.dto";
import { UpdateSubmissionReviewStatusDto } from "./dto/update-submission-review-status.dto";
import { UpsertAssignmentTemplateDto } from "./dto/upsert-assignment-template.dto";

@Controller("instructor/assignments")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin", "instructor", "assistant")
export class InstructorAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get("workspace")
  getWorkspace() {
    return this.assignmentsService.getInstructorWorkspace();
  }

  @Post()
  createAssignment(@Body() body: CreateInstructorAssignmentDto) {
    return this.assignmentsService.createInstructorAssignment(body);
  }

  @Patch(":assignmentId")
  updateAssignment(
    @Param("assignmentId") assignmentId: string,
    @Body() body: UpdateInstructorAssignmentDto,
  ) {
    return this.assignmentsService.updateInstructorAssignment(assignmentId, body);
  }

  @Put(":assignmentId/template")
  upsertAssignmentTemplate(
    @Param("assignmentId") assignmentId: string,
    @Body() body: UpsertAssignmentTemplateDto,
  ) {
    return this.assignmentsService.upsertAssignmentTemplate(assignmentId, body);
  }

  @Patch("submissions/:submissionId")
  updateSubmissionReviewStatus(
    @Param("submissionId") submissionId: string,
    @Body() body: UpdateSubmissionReviewStatusDto,
  ) {
    return this.assignmentsService.updateSubmissionReviewStatus(submissionId, body);
  }

  @Post("submissions/:submissionId/feedback")
  addSubmissionFeedback(
    @Param("submissionId") submissionId: string,
    @Body() body: AddSubmissionFeedbackDto,
  ) {
    return this.assignmentsService.addSubmissionFeedback(submissionId, body);
  }

  @Get(":assignmentId/timeline")
  getAssignmentTimeline(@Param("assignmentId") assignmentId: string) {
    return this.assignmentsService.getAssignmentTimeline(assignmentId);
  }
}
