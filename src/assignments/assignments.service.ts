import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AdminService } from "../admin/admin.service";
import { FILES_REPOSITORY, FilesRepository } from "../files/files.repository";
import { StoredFileRecord } from "../files/files.types";
import {
  ASSIGNMENTS_REPOSITORY,
  AssignmentsRepository,
} from "./assignment.repository";
import {
  AssignmentActorRole,
  AssignmentDatabase,
  AssignmentSubmission,
  AssignmentTemplate,
  AssignmentTimelineData,
  CreateInstructorAssignmentResult,
  InstructorSubmissionWorkspaceData,
  SubmissionDetailData,
  StudentProfile,
  StudentSubmissionWorkspaceData,
  SubmissionDashboardByStudent,
  SubmissionDashboardMetric,
  SubmissionAttachment,
  SubmissionReviewStatus,
} from "./assignment.types";
import { AddSubmissionFeedbackDto } from "./dto/add-submission-feedback.dto";
import { CreateInstructorAssignmentDto } from "./dto/create-instructor-assignment.dto";
import { CreateStudentSubmissionDto } from "./dto/create-student-submission.dto";
import { UpdateInstructorAssignmentDto } from "./dto/update-instructor-assignment.dto";
import { UpdateSubmissionReviewStatusDto } from "./dto/update-submission-review-status.dto";
import { UpsertAssignmentTemplateDto } from "./dto/upsert-assignment-template.dto";

@Injectable()
export class AssignmentsService {
  constructor(
    @Inject(ASSIGNMENTS_REPOSITORY)
    private readonly repository: AssignmentsRepository,
    private readonly adminService: AdminService,
    @Inject(FILES_REPOSITORY)
    private readonly filesRepository: FilesRepository,
  ) {}

  getStudentWorkspace(studentId?: string, studentName?: string): StudentSubmissionWorkspaceData {
    const database = this.repository.read();
    const profile = this.resolveStudentProfile(database, studentId, studentName);
    const assignments = this.filterAssignmentsByCourseIds(database, profile.enrolledCourseIds);
    const assignmentIdSet = new Set(assignments.map((assignment) => assignment.id));
    const templates = database.templates.filter((template) => assignmentIdSet.has(template.assignmentId));
    const submissions = database.submissions
      .filter((submission) => submission.studentId === profile.id)
      .sort((a, b) => Number(new Date(b.submittedAt)) - Number(new Date(a.submittedAt)));

    return {
      studentId: profile.id,
      studentName: profile.name,
      enrolledCourses: profile.enrolledCourseIds.map((courseId) => ({
        courseId,
        courseTitle: this.resolveCourseTitle(database, courseId),
      })),
      assignments,
      templates,
      submissions,
    };
  }

  createStudentSubmission(
    input: CreateStudentSubmissionDto & { studentId: string; studentName: string },
  ): AssignmentSubmission {
    const database = this.repository.read();
    const assignment = database.assignments.find((item) => item.id === input.assignmentId);

    if (!assignment) {
      throw new NotFoundException({
        code: "ASSIGNMENT_NOT_FOUND",
        message: "선택한 과제를 찾을 수 없습니다.",
      });
    }

    if (!input.enrolledCourseIds.includes(assignment.courseId)) {
      throw new BadRequestException({
        code: "NOT_ENROLLED_COURSE",
        message: "수강 중인 과정의 과제만 제출할 수 있습니다.",
      });
    }

    const sanitizedMessage = input.message.trim();
    const sanitizedCode = input.code.trim();

    if (sanitizedMessage.length === 0 && sanitizedCode.length === 0 && input.attachments.length === 0) {
      throw new BadRequestException({
        code: "INVALID_SUBMISSION",
        message: "메시지, 코드, 파일 중 하나 이상은 제출해야 합니다.",
      });
    }

    const latest = this.findLatestStudentSubmission(database, input.studentId, assignment.id);
    const revision = latest ? latest.revision + 1 : 1;
    const now = new Date().toISOString();
    const submission: AssignmentSubmission = {
      id: this.createRecordId("submission"),
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      courseId: assignment.courseId,
      courseTitle: assignment.courseTitle,
      studentId: input.studentId,
      studentName: input.studentName,
      message: input.message,
      code: input.code,
      codeLanguage: input.codeLanguage,
      editorType: input.editorType,
      attachments: this.resolveSubmissionAttachments(input.studentId, input.attachments),
      submittedAt: now,
      updatedAt: now,
      reviewStatus: "SUBMITTED",
      revision,
      feedbackHistory: [],
    };

    database.submissions.unshift(submission);
    database.timeline.unshift({
      id: this.createRecordId("timeline"),
      submissionId: submission.id,
      type: revision > 1 ? "RESUBMITTED" : "SUBMITTED",
      actorId: input.studentId,
      actorName: input.studentName,
      createdAt: now,
      note: revision > 1 ? `${revision}차 재제출` : "초기 제출",
    });

    this.upsertStudentDirectory(database, {
      studentId: input.studentId,
      studentName: input.studentName,
      enrolledCourseIds: input.enrolledCourseIds,
    });

    this.repository.write(database);
    this.recordAuditEvent({
      courseId: submission.courseId,
      assignmentId: submission.assignmentId,
      assignmentTitle: submission.assignmentTitle,
      submissionId: submission.id,
      actorId: submission.studentId,
      actorName: submission.studentName,
      actorRole: "STUDENT",
      action: revision > 1 ? "RESUBMITTED" : "SUBMITTED",
      note: revision > 1 ? `${revision}차 재제출` : "초기 제출",
    });

    return submission;
  }

  getInstructorWorkspace(): InstructorSubmissionWorkspaceData {
    const database = this.repository.read();
    const latestSubmissions = this.getLatestSubmissions(database.submissions).sort(
      (a, b) => Number(new Date(b.submittedAt)) - Number(new Date(a.submittedAt)),
    );

    return {
      assignments: this.clone(database.assignments),
      templates: this.clone(database.templates),
      submissions: latestSubmissions,
      timeline: this.clone(database.timeline).sort(
        (a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)),
      ),
      videos: this.clone(database.videos).sort(
        (a, b) => Number(new Date(b.uploadedAt)) - Number(new Date(a.uploadedAt)),
      ),
      dashboard: this.computeDashboardMetric(database),
      dashboardByStudent: this.computeDashboardByStudent(database).sort(
        (a, b) => b.submissionRate - a.submissionRate,
      ),
    };
  }

  getSubmissionDetail(submissionId: string): SubmissionDetailData {
    const database = this.repository.read();
    const submission = database.submissions.find((item) => item.id === submissionId);

    if (!submission) {
      throw new NotFoundException({
        code: "SUBMISSION_NOT_FOUND",
        message: "선택한 제출 이력을 찾을 수 없습니다.",
      });
    }

    const revisionHistory = database.submissions
      .filter(
        (item) => item.assignmentId === submission.assignmentId && item.studentId === submission.studentId,
      )
      .sort(
        (a, b) =>
          b.revision - a.revision ||
          Number(new Date(b.submittedAt)) - Number(new Date(a.submittedAt)),
      );
    const revisionIdSet = new Set(revisionHistory.map((item) => item.id));
    const assignment = database.assignments.find((item) => item.id === submission.assignmentId);
    const timeline = database.timeline
      .filter((event) => event.submissionId && revisionIdSet.has(event.submissionId))
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));

    return {
      submission,
      assignment,
      revisionHistory,
      timeline,
    };
  }

  getAssignmentTimeline(assignmentId: string): AssignmentTimelineData {
    const database = this.repository.read();
    const assignmentSubmissions = database.submissions
      .filter((submission) => submission.assignmentId === assignmentId)
      .sort((a, b) => Number(new Date(b.submittedAt)) - Number(new Date(a.submittedAt)));
    const submissionIdSet = new Set(assignmentSubmissions.map((item) => item.id));
    const timeline = database.timeline
      .filter((event) => event.submissionId && submissionIdSet.has(event.submissionId))
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));
    const submissionLabelById = assignmentSubmissions.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = `${item.studentName} · ${item.assignmentTitle}`;
      return acc;
    }, {});

    return {
      timeline,
      submissionLabelById,
    };
  }

  createInstructorAssignment(
    input: CreateInstructorAssignmentDto & { actorId: string; actorName: string; actorRole?: AssignmentActorRole },
  ): CreateInstructorAssignmentResult {
    const database = this.repository.read();
    const now = new Date().toISOString();
    const title = input.title.trim();
    const prompt = input.prompt.trim();

    if (title.length === 0 || prompt.length === 0) {
      throw new BadRequestException({
        code: "INVALID_SUBMISSION",
        message: "과제 제목과 설명을 입력하세요.",
      });
    }

    const assignment = {
      id: this.createRecordId("assignment"),
      courseId: input.courseId,
      courseTitle: input.courseTitle,
      title,
      prompt,
      dueAt: input.dueAt,
      createdAt: now,
      allowFileUpload: input.allowFileUpload,
      allowCodeEditor: input.allowCodeEditor,
    };

    database.assignments.unshift(assignment);

    let template: AssignmentTemplate | undefined;

    if (input.initialTemplate && input.initialTemplate.content.trim().length > 0) {
      template = {
        id: this.createRecordId("template"),
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        courseId: assignment.courseId,
        courseTitle: assignment.courseTitle,
        editorType: input.initialTemplate.editorType,
        codeLanguage: input.initialTemplate.codeLanguage,
        title: input.initialTemplate.title.trim() || `${assignment.title} 템플릿`,
        content: input.initialTemplate.content,
        updatedAt: now,
        updatedById: input.actorId,
        updatedByName: input.actorName,
      };
      database.templates.unshift(template);
    }

    database.timeline.unshift({
      id: this.createRecordId("timeline"),
      type: "COMMENTED",
      actorId: input.actorId,
      actorName: input.actorName,
      createdAt: now,
      note: `과제 등록: ${assignment.courseTitle} · ${assignment.title}`,
    });

    if (template) {
      database.timeline.unshift({
        id: this.createRecordId("timeline"),
        type: "COMMENTED",
        actorId: input.actorId,
        actorName: input.actorName,
        createdAt: now,
        note: `초기 템플릿 등록: ${template.title}`,
      });
    }

    this.repository.write(database);
    const actorRole = input.actorRole ?? this.resolveActorRole(input.actorId, "INSTRUCTOR");

    this.recordAuditEvent({
      courseId: assignment.courseId,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole,
      action: "ASSIGNMENT_UPDATED",
      note: "과제 등록",
    });

    if (template) {
      this.recordAuditEvent({
        courseId: template.courseId,
        assignmentId: template.assignmentId,
        assignmentTitle: template.assignmentTitle,
        actorId: input.actorId,
        actorName: input.actorName,
        actorRole,
        action: "TEMPLATE_UPDATED",
        note: "초기 템플릿 등록",
      });
    }

    return {
      assignment,
      template,
    };
  }

  updateInstructorAssignment(
    assignmentId: string,
    input: UpdateInstructorAssignmentDto & { actorId: string; actorName: string; actorRole?: AssignmentActorRole },
  ) {
    const database = this.repository.read();
    const target = database.assignments.find((assignment) => assignment.id === assignmentId);

    if (!target) {
      throw new NotFoundException({
        code: "ASSIGNMENT_NOT_FOUND",
        message: "선택한 과제를 찾을 수 없습니다.",
      });
    }

    const updated = {
      ...target,
      title: input.title?.trim() ? input.title.trim() : target.title,
      prompt:
        input.prompt === undefined ? target.prompt : input.prompt.trim() || target.prompt,
      dueAt: input.dueAt ?? target.dueAt,
      allowFileUpload: input.allowFileUpload ?? target.allowFileUpload,
      allowCodeEditor: input.allowCodeEditor ?? target.allowCodeEditor,
    };

    const assignmentIndex = database.assignments.findIndex((assignment) => assignment.id === assignmentId);
    database.assignments[assignmentIndex] = updated;

    database.submissions = database.submissions.map((submission) =>
      submission.assignmentId === updated.id
        ? {
            ...submission,
            assignmentTitle: updated.title,
          }
        : submission,
    );

    database.templates = database.templates.map((template) =>
      template.assignmentId === updated.id
        ? {
            ...template,
            assignmentTitle: updated.title,
          }
        : template,
    );

    database.timeline.unshift({
      id: this.createRecordId("timeline"),
      type: "COMMENTED",
      actorId: input.actorId,
      actorName: input.actorName,
      createdAt: new Date().toISOString(),
      note: `과제 수정: ${updated.courseTitle} · ${updated.title}`,
    });

    this.repository.write(database);
    this.recordAuditEvent({
      courseId: updated.courseId,
      assignmentId: updated.id,
      assignmentTitle: updated.title,
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: input.actorRole ?? this.resolveActorRole(input.actorId, "INSTRUCTOR"),
      action: "ASSIGNMENT_UPDATED",
      note: "과제 메타 수정",
    });

    return updated;
  }

  upsertAssignmentTemplate(
    assignmentId: string,
    input: UpsertAssignmentTemplateDto & { actorId: string; actorName: string; actorRole?: AssignmentActorRole },
  ): AssignmentTemplate {
    const database = this.repository.read();
    const assignment = database.assignments.find((item) => item.id === assignmentId);

    if (!assignment) {
      throw new NotFoundException({
        code: "ASSIGNMENT_NOT_FOUND",
        message: "선택한 과제를 찾을 수 없습니다.",
      });
    }

    const updatedAt = new Date().toISOString();
    const existingIndex = database.templates.findIndex(
      (template) =>
        template.assignmentId === assignmentId &&
        template.editorType === input.editorType &&
        template.codeLanguage === input.codeLanguage,
    );

    const upserted: AssignmentTemplate = {
      id: existingIndex >= 0 ? database.templates[existingIndex].id : this.createRecordId("template"),
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      courseId: assignment.courseId,
      courseTitle: assignment.courseTitle,
      editorType: input.editorType,
      codeLanguage: input.codeLanguage,
      title: input.title.trim() || `${assignment.title} 템플릿`,
      content: input.content,
      updatedAt,
      updatedById: input.actorId,
      updatedByName: input.actorName,
    };

    if (existingIndex >= 0) {
      database.templates[existingIndex] = upserted;
    } else {
      database.templates.unshift(upserted);
    }

    database.timeline.unshift({
      id: this.createRecordId("timeline"),
      type: "COMMENTED",
      actorId: input.actorId,
      actorName: input.actorName,
      createdAt: updatedAt,
      note: `템플릿 업데이트: ${assignment.title} (${input.editorType}/${input.codeLanguage})`,
    });

    this.repository.write(database);
    this.recordAuditEvent({
      courseId: assignment.courseId,
      assignmentId,
      assignmentTitle: assignment.title,
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: input.actorRole ?? this.resolveActorRole(input.actorId, "INSTRUCTOR"),
      action: "TEMPLATE_UPDATED",
      note: `템플릿 업데이트: ${input.editorType}/${input.codeLanguage}`,
    });

    return upserted;
  }

  updateSubmissionReviewStatus(
    submissionId: string,
    input: UpdateSubmissionReviewStatusDto & { actorId: string; actorName: string; actorRole?: AssignmentActorRole },
  ): AssignmentSubmission {
    const database = this.repository.read();
    const target = database.submissions.find((submission) => submission.id === submissionId);

    if (!target) {
      throw new NotFoundException({
        code: "SUBMISSION_NOT_FOUND",
        message: "선택한 제출 이력을 찾을 수 없습니다.",
      });
    }

    const updatedAt = new Date().toISOString();
    const updated: AssignmentSubmission = {
      ...target,
      reviewStatus: input.reviewStatus,
      updatedAt,
    };

    const index = database.submissions.findIndex((submission) => submission.id === submissionId);
    database.submissions[index] = updated;

    const note = input.comment?.trim() || this.statusLabelByReviewState(input.reviewStatus);

    database.timeline.unshift({
      id: this.createRecordId("timeline"),
      submissionId: updated.id,
      type: "REVIEW_STATUS_CHANGED",
      actorId: input.actorId,
      actorName: input.actorName,
      createdAt: updatedAt,
      note,
    });

    this.repository.write(database);
    this.recordAuditEvent({
      courseId: updated.courseId,
      assignmentId: updated.assignmentId,
      assignmentTitle: updated.assignmentTitle,
      submissionId: updated.id,
      actorId: input.actorId,
      actorName: input.actorName,
      actorRole: input.actorRole ?? this.resolveActorRole(input.actorId, "INSTRUCTOR"),
      action: "REVIEW_STATUS_CHANGED",
      note,
    });

    return updated;
  }

  addSubmissionFeedback(
    submissionId: string,
    input: AddSubmissionFeedbackDto & { reviewerId: string; reviewerName: string; reviewerRole?: AssignmentActorRole },
  ): AssignmentSubmission {
    const database = this.repository.read();
    const target = database.submissions.find((submission) => submission.id === submissionId);

    if (!target) {
      throw new NotFoundException({
        code: "SUBMISSION_NOT_FOUND",
        message: "선택한 제출 이력을 찾을 수 없습니다.",
      });
    }

    const now = new Date().toISOString();
    const feedbackEntry = {
      id: this.createRecordId("feedback"),
      reviewerId: input.reviewerId,
      reviewerName: input.reviewerName,
      messageFormat: input.messageFormat ?? "TEXT",
      entryType: input.entryType ?? "GENERAL",
      message: input.message,
      code: input.code,
      codeLanguage: input.codeLanguage,
      attachments: this.resolveSubmissionAttachments(input.reviewerId, input.attachments),
      createdAt: now,
    };

    const updated: AssignmentSubmission = {
      ...target,
      feedbackHistory: [feedbackEntry, ...(target.feedbackHistory ?? [])],
      updatedAt: now,
      reviewStatus: input.reviewStatus ?? target.reviewStatus,
    };

    const index = database.submissions.findIndex((submission) => submission.id === target.id);
    database.submissions[index] = updated;

    const feedbackNote = input.message.trim().slice(0, 120) || "피드백 등록";

    database.timeline.unshift({
      id: this.createRecordId("timeline"),
      submissionId: updated.id,
      type: "COMMENTED",
      actorId: input.reviewerId,
      actorName: input.reviewerName,
      createdAt: now,
      note: feedbackNote,
    });

    if (input.reviewStatus) {
      const statusNote = this.statusLabelByReviewState(input.reviewStatus);
      database.timeline.unshift({
        id: this.createRecordId("timeline"),
        submissionId: updated.id,
        type: "REVIEW_STATUS_CHANGED",
        actorId: input.reviewerId,
        actorName: input.reviewerName,
        createdAt: now,
        note: statusNote,
      });
    }

    this.repository.write(database);
    const actorRole = input.reviewerRole ?? this.resolveActorRole(input.reviewerId, "INSTRUCTOR");

    this.recordAuditEvent({
      courseId: updated.courseId,
      assignmentId: updated.assignmentId,
      assignmentTitle: updated.assignmentTitle,
      submissionId: updated.id,
      actorId: input.reviewerId,
      actorName: input.reviewerName,
      actorRole,
      action: "FEEDBACK_ADDED",
      note: feedbackNote,
    });

    if (input.reviewStatus) {
      this.recordAuditEvent({
        courseId: updated.courseId,
        assignmentId: updated.assignmentId,
        assignmentTitle: updated.assignmentTitle,
        submissionId: updated.id,
        actorId: input.reviewerId,
        actorName: input.reviewerName,
        actorRole,
        action: "REVIEW_STATUS_CHANGED",
        note: this.statusLabelByReviewState(input.reviewStatus),
      });
    }

    return updated;
  }

  private resolveStudentProfile(
    database: AssignmentDatabase,
    studentId?: string,
    studentName?: string,
  ): StudentProfile {
    const defaultStudent = database.students[0] ?? {
      id: "student-default",
      name: "기본 수강생",
      enrolledCourseIds: [],
    };
    const targetId = studentId?.trim() || defaultStudent.id;
    const existing = database.students.find((student) => student.id === targetId);

    if (existing) {
      if (studentName?.trim()) {
        existing.name = studentName.trim();
      }
      return existing;
    }

    const created: StudentProfile = {
      id: targetId,
      name: studentName?.trim() || "신규 수강생",
      enrolledCourseIds: [],
    };

    database.students.push(created);
    return created;
  }

  private upsertStudentDirectory(
    database: AssignmentDatabase,
    student: {
      studentId: string;
      studentName: string;
      enrolledCourseIds: string[];
    },
  ) {
    const existing = database.students.find((item) => item.id === student.studentId);

    if (!existing) {
      database.students.push({
        id: student.studentId,
        name: student.studentName,
        enrolledCourseIds: [...new Set(student.enrolledCourseIds)],
      });
      return;
    }

    existing.name = student.studentName;
    existing.enrolledCourseIds = [...new Set(student.enrolledCourseIds)];
  }

  private findLatestStudentSubmission(
    database: AssignmentDatabase,
    studentId: string,
    assignmentId: string,
  ) {
    return database.submissions
      .filter((submission) => submission.studentId === studentId && submission.assignmentId === assignmentId)
      .sort(
        (a, b) =>
          b.revision - a.revision ||
          Number(new Date(b.updatedAt)) - Number(new Date(a.updatedAt)),
      )[0];
  }

  private getLatestSubmissions(submissions: AssignmentSubmission[]) {
    const latestByKey = new Map<string, AssignmentSubmission>();

    for (const submission of submissions) {
      const key = `${submission.studentId}:${submission.assignmentId}`;
      const current = latestByKey.get(key);

      if (
        !current ||
        submission.revision > current.revision ||
        Number(new Date(submission.updatedAt)) > Number(new Date(current.updatedAt))
      ) {
        latestByKey.set(key, submission);
      }
    }

    return Array.from(latestByKey.values());
  }

  private resolveSubmissionAttachments(ownerId: string, attachments: SubmissionAttachment[]) {
    return attachments.map((attachment) => {
      const attachmentId = attachment.id.trim();
      const linkedFile = this.filesRepository.findById(attachmentId);

      if (!linkedFile) {
        if (this.looksLikeFileId(attachmentId)) {
          throw new BadRequestException({
            code: "ATTACHMENT_FILE_NOT_FOUND",
            message: `attachment.id=${attachmentId} 파일을 찾을 수 없습니다.`,
          });
        }

        return this.clone(attachment);
      }

      this.assertAttachmentFileOwnershipAndStatus(ownerId, linkedFile);

      return {
        id: linkedFile.fileId,
        fileName: linkedFile.fileName,
        mimeType: linkedFile.contentType,
        sizeBytes: linkedFile.size,
      };
    });
  }

  private assertAttachmentFileOwnershipAndStatus(ownerId: string, file: StoredFileRecord) {
    if (file.ownerId !== ownerId) {
      throw new BadRequestException({
        code: "ATTACHMENT_FILE_FORBIDDEN",
        message: `attachment.id=${file.fileId} 파일 소유자와 요청 사용자가 일치하지 않습니다.`,
      });
    }

    if (file.status !== "COMPLETED") {
      throw new BadRequestException({
        code: "ATTACHMENT_FILE_NOT_READY",
        message: `attachment.id=${file.fileId} 파일 업로드가 완료되지 않았습니다.`,
      });
    }
  }

  private looksLikeFileId(id: string) {
    return /^file-/i.test(id);
  }

  private computeDashboardMetric(database: AssignmentDatabase): SubmissionDashboardMetric {
    const expectedSubmissionCount = database.students.reduce((count, student) => {
      const assignmentCount = this.filterAssignmentsByCourseIds(
        database,
        student.enrolledCourseIds,
      ).length;
      return count + assignmentCount;
    }, 0);

    const latestSubmissions = this.getLatestSubmissions(database.submissions);
    const reviewedCount = latestSubmissions.filter(
      (submission) => submission.reviewStatus === "REVIEWED",
    ).length;
    const needsRevisionCount = latestSubmissions.filter(
      (submission) => submission.reviewStatus === "NEEDS_REVISION",
    ).length;
    const pendingReviewCount = latestSubmissions.filter(
      (submission) => submission.reviewStatus === "SUBMITTED",
    ).length;
    const submittedCount = latestSubmissions.length;

    return {
      expectedSubmissionCount,
      submittedCount,
      submissionRate: this.calculateRate(submittedCount, expectedSubmissionCount),
      reviewedCount,
      needsRevisionCount,
      pendingReviewCount,
    };
  }

  private computeDashboardByStudent(database: AssignmentDatabase): SubmissionDashboardByStudent[] {
    const latestSubmissions = this.getLatestSubmissions(database.submissions);

    return database.students.map((student) => {
      const expectedSubmissionCount = this.filterAssignmentsByCourseIds(
        database,
        student.enrolledCourseIds,
      ).length;
      const studentSubmissions = latestSubmissions
        .filter((submission) => submission.studentId === student.id)
        .sort((a, b) => Number(new Date(b.submittedAt)) - Number(new Date(a.submittedAt)));

      return {
        studentId: student.id,
        studentName: student.name,
        expectedSubmissionCount,
        submittedCount: studentSubmissions.length,
        submissionRate: this.calculateRate(studentSubmissions.length, expectedSubmissionCount),
        latestSubmittedAt: studentSubmissions[0]?.submittedAt,
      };
    });
  }

  private filterAssignmentsByCourseIds(database: AssignmentDatabase, courseIds: string[]) {
    const courseIdSet = new Set(courseIds);
    return database.assignments.filter((assignment) => courseIdSet.has(assignment.courseId));
  }

  private resolveCourseTitle(database: AssignmentDatabase, courseId: string) {
    return (
      database.assignments.find((assignment) => assignment.courseId === courseId)?.courseTitle ??
      courseId
    );
  }

  private createRecordId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
  }

  private statusLabelByReviewState(status: SubmissionReviewStatus) {
    if (status === "REVIEWED") {
      return "리뷰 완료";
    }

    if (status === "NEEDS_REVISION") {
      return "수정 요청";
    }

    return "재검토";
  }

  private resolveActorRole(actorId: string, fallback: AssignmentActorRole): AssignmentActorRole {
    const normalized = actorId.toLowerCase();

    if (normalized.includes("assistant")) {
      return "ASSISTANT";
    }

    if (normalized.includes("student")) {
      return "STUDENT";
    }

    if (normalized.includes("admin")) {
      return "ADMIN";
    }

    return fallback;
  }

  private recordAuditEvent(input: {
    courseId: string;
    assignmentId: string;
    assignmentTitle: string;
    submissionId?: string;
    actorId: string;
    actorName: string;
    actorRole: AssignmentActorRole;
    action:
      | "SUBMITTED"
      | "RESUBMITTED"
      | "REVIEW_STATUS_CHANGED"
      | "FEEDBACK_ADDED"
      | "ASSIGNMENT_UPDATED"
      | "TEMPLATE_UPDATED";
    note?: string;
  }) {
    this.adminService.recordCourseAssignmentAuditEvent(input);
  }

  private calculateRate(submittedCount: number, expectedCount: number) {
    if (expectedCount <= 0) {
      return 0;
    }

    return Number(((submittedCount / expectedCount) * 100).toFixed(1));
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
