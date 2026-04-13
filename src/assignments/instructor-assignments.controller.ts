import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AssignmentsService } from "./assignments.service";
import { AddSubmissionFeedbackDto } from "./dto/add-submission-feedback.dto";
import { CreateInstructorAssignmentDto } from "./dto/create-instructor-assignment.dto";
import { UpdateInstructorAssignmentDto } from "./dto/update-instructor-assignment.dto";
import { UpdateSubmissionReviewStatusDto } from "./dto/update-submission-review-status.dto";
import { UpsertAssignmentTemplateDto } from "./dto/upsert-assignment-template.dto";

@ApiTags("assignments / instructor")
@ApiBearerAuth("access-token")
@Controller("instructor/assignments")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin", "instructor", "assistant")
export class InstructorAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get("workspace")
  @ApiOperation({ summary: "강사 과제 워크스페이스" })
  getWorkspace() {
    return this.assignmentsService.getInstructorWorkspace();
  }

  @Post()
  @ApiOperation({ summary: "과제 생성" })
  createAssignment(@Body() body: CreateInstructorAssignmentDto) {
    return this.assignmentsService.createInstructorAssignment(body);
  }

  @Patch(":assignmentId")
  @ApiOperation({ summary: "과제 수정" })
  updateAssignment(
    @Param("assignmentId") assignmentId: string,
    @Body() body: UpdateInstructorAssignmentDto,
  ) {
    return this.assignmentsService.updateInstructorAssignment(assignmentId, body);
  }

  @Put(":assignmentId/template")
  @ApiOperation({ summary: "과제 템플릿 업서트" })
  upsertAssignmentTemplate(
    @Param("assignmentId") assignmentId: string,
    @Body() body: UpsertAssignmentTemplateDto,
  ) {
    return this.assignmentsService.upsertAssignmentTemplate(assignmentId, body);
  }

  @Patch("submissions/:submissionId")
  @ApiOperation({ summary: "제출 리뷰 상태 변경" })
  updateSubmissionReviewStatus(
    @Param("submissionId") submissionId: string,
    @Body() body: UpdateSubmissionReviewStatusDto,
  ) {
    return this.assignmentsService.updateSubmissionReviewStatus(submissionId, body);
  }

  @Post("submissions/:submissionId/feedback")
  @ApiOperation({ summary: "제출에 피드백 추가" })
  addSubmissionFeedback(
    @Param("submissionId") submissionId: string,
    @Body() body: AddSubmissionFeedbackDto,
  ) {
    return this.assignmentsService.addSubmissionFeedback(submissionId, body);
  }

  @Get(":assignmentId/timeline")
  @ApiOperation({ summary: "과제 제출 타임라인" })
  getAssignmentTimeline(@Param("assignmentId") assignmentId: string) {
    return this.assignmentsService.getAssignmentTimeline(assignmentId);
  }
}
