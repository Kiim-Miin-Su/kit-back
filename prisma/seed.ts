import { PrismaClient } from "@prisma/client";
import { scryptSync } from "node:crypto";
import {
  createFrontAlignedAdminSeed,
  createFrontAlignedAssignmentDatabase,
  createFrontAlignedAttendanceDatabase,
  createFrontAlignedCoursesDatabase,
  createFrontAlignedEnrollmentsDatabase,
  createFrontAlignedFileRecords,
  createFrontAlignedUserSeeds,
} from "../src/mock-data/front-aligned.mock";

const prisma = new PrismaClient();

async function main() {
  await clearDatabase();

  const userSeeds = createFrontAlignedUserSeeds();
  const coursesDatabase = createFrontAlignedCoursesDatabase();
  const enrollmentsDatabase = createFrontAlignedEnrollmentsDatabase();
  const attendanceDatabase = createFrontAlignedAttendanceDatabase();
  const assignmentsDatabase = createFrontAlignedAssignmentDatabase();
  const fileRecords = buildPersistedFiles(createFrontAlignedFileRecords(), assignmentsDatabase);
  const adminSeed = createFrontAlignedAdminSeed();
  const persistedCourses = buildPersistedCourses(coursesDatabase, adminSeed, userSeeds);

  for (const user of userSeeds) {
    const credential = createSeedCredential(user.password, user.userId);
    await prisma.user.create({
      data: {
        userId: user.userId,
        email: user.email,
        passwordHash: credential.passwordHash,
        passwordSalt: credential.passwordSalt,
        name: user.userName,
        birthDate: user.birthDate,
        title: user.title,
        role: mapUserRole(user.role),
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.createdAt),
      },
    });
  }

  for (const course of persistedCourses) {
    await prisma.course.create({
      data: {
        courseId: course.id,
        slug: course.slug,
        title: course.title,
        subtitle: course.subtitle,
        description: course.description,
        category: course.category,
        tags: course.tags,
        level: mapCourseLevel(course.level),
        durationLabel: course.durationLabel,
        lessonCount: course.lessonCount,
        priceLabel: course.priceLabel,
        rating: course.rating,
        reviewCount: course.reviewCount,
        enrollmentCount: course.enrollmentCount,
        thumbnailTone: course.thumbnailTone,
        instructorUserId: findUserIdByName(userSeeds, course.instructor.name),
        classScope: course.classScope,
        status: course.lifecycleStatus,
        sectionLabel: course.sectionLabel,
        roomLabel: course.roomLabel,
        capacity: course.capacity,
        startDate: course.startDate,
        endDate: course.endDate,
        enrollmentStartDate: course.enrollmentStartDate,
        enrollmentEndDate: course.enrollmentEndDate,
        pacingType: "INSTRUCTOR_PACED",
        defaultEnrollmentStatus: course.enrollmentStatus,
        enrollmentStatusLabel: course.enrollmentStatusLabel,
        isFeatured: course.isFeatured,
        learningPoints: course.learningPoints,
        curriculumPreviews: {
          create: course.curriculumPreview.map((item, index) => ({
            previewId: item.id,
            title: item.title,
            durationLabel: item.durationLabel,
            sortOrder: index,
            isPreview: item.isPreview ?? false,
            summary: item.summary,
            headers: item.headers ?? undefined,
          })),
        },
      },
    });
  }

  for (const member of adminSeed.memberBindings) {
    await prisma.courseMember.create({
      data: {
        courseId: member.courseId,
        userId: member.userId,
        role: member.role,
      },
    });
  }

  for (const scopePolicy of adminSeed.courses) {
    await prisma.attendanceScopePolicy.createMany({
      data: [
        {
          courseId: scopePolicy.courseId,
          scope: "global",
        },
        {
          courseId: scopePolicy.courseId,
          scope: scopePolicy.classScope,
        },
      ],
      skipDuplicates: true,
    });
  }

  for (const schedule of adminSeed.schedules) {
    await prisma.schedule.create({
      data: {
        scheduleId: schedule.id,
        courseId:
          schedule.visibilityType === "class"
            ? findCourseIdByClassScope(adminSeed.courses, schedule.visibilityScope)
            : null,
        title: schedule.title,
        categoryLabel: schedule.categoryLabel,
        dateKey: schedule.dateKey,
        dateLabel: schedule.dateLabel,
        timeLabel: schedule.timeLabel,
        locationLabel: schedule.locationLabel,
        visibilityType: schedule.visibilityType === "global" ? "GLOBAL" : "CLASS",
        visibilityScope: schedule.visibilityScope,
        visibilityLabel: schedule.visibilityLabel,
        requiresAttendanceCheck: schedule.requiresAttendanceCheck,
        attendanceWindowLabel: schedule.attendanceWindowLabel,
        attendanceWindowStartAt: schedule.attendanceWindowStartAt
          ? new Date(schedule.attendanceWindowStartAt)
          : undefined,
        attendanceWindowEndAt: schedule.attendanceWindowEndAt
          ? new Date(schedule.attendanceWindowEndAt)
          : undefined,
        sourceType: schedule.sourceType,
        supportsCodeCheckIn: Boolean(
          attendanceDatabase.checkInCodeByScheduleKey[normalizeScheduleKey(schedule.id)],
        ),
        checkInCode: attendanceDatabase.checkInCodeByScheduleKey[normalizeScheduleKey(schedule.id)],
      },
    });
  }

  for (const enrollment of enrollmentsDatabase.enrollments) {
    await prisma.enrollment.create({
      data: {
        enrollmentId: enrollment.enrollmentId,
        courseId: enrollment.courseId,
        userId: enrollment.userId,
        status: enrollment.status,
        enrolledAt: new Date(enrollment.enrolledAt),
        completedAt: enrollment.completedAt ? new Date(enrollment.completedAt) : undefined,
        updatedAt: new Date(enrollment.updatedAt),
      },
    });
  }

  for (const record of attendanceDatabase.records) {
    const scheduleId = resolveScheduleIdFromKey(record.scheduleKey);
    await prisma.attendanceRecord.create({
      data: {
        userId: record.userId,
        scheduleId,
        attendanceStatus: record.attendanceStatus,
        checkedAt: record.checkedAt ? new Date(record.checkedAt) : undefined,
      },
    });
  }

  for (const assignment of assignmentsDatabase.assignments) {
    await prisma.assignment.create({
      data: {
        assignmentId: assignment.id,
        courseId: assignment.courseId,
        title: assignment.title,
        prompt: assignment.prompt,
        dueAt: new Date(assignment.dueAt),
        createdAt: new Date(assignment.createdAt),
        allowFileUpload: assignment.allowFileUpload,
        allowCodeEditor: assignment.allowCodeEditor,
      },
    });
  }

  for (const template of assignmentsDatabase.templates) {
    await prisma.assignmentTemplate.create({
      data: {
        templateId: template.id,
        assignmentId: template.assignmentId,
        courseId: template.courseId,
        editorType: template.editorType,
        codeLanguage: mapCodeLanguage(template.codeLanguage),
        title: template.title,
        content: template.content,
        updatedAt: new Date(template.updatedAt),
        updatedByUserId: template.updatedById,
      },
    });
  }

  for (const file of fileRecords) {
    await prisma.file.create({
      data: {
        fileId: file.fileId,
        ownerUserId: file.ownerId,
        fileName: file.fileName,
        bucketKey: file.bucketKey,
        contentType: file.contentType,
        size: file.size,
        checksum: file.checksum,
        status: file.status,
        uploadUrl: file.uploadUrl,
        downloadUrl: file.downloadUrl,
        createdAt: new Date(file.createdAt),
        completedAt: file.completedAt ? new Date(file.completedAt) : undefined,
      },
    });
  }

  for (const submission of assignmentsDatabase.submissions) {
    await prisma.submissionRevision.create({
      data: {
        submissionRevisionId: submission.id,
        submissionGroupId: buildSubmissionGroupId(submission.id),
        assignmentId: submission.assignmentId,
        courseId: submission.courseId,
        studentUserId: submission.studentId,
        studentNameSnapshot: submission.studentName,
        assignmentTitleSnapshot: submission.assignmentTitle,
        courseTitleSnapshot: submission.courseTitle,
        message: submission.message,
        code: submission.code,
        codeLanguage: mapCodeLanguage(submission.codeLanguage),
        editorType: submission.editorType,
        reviewStatus: submission.reviewStatus,
        revision: submission.revision,
        submittedAt: new Date(submission.submittedAt),
        updatedAt: new Date(submission.updatedAt),
      },
    });

    for (const attachment of submission.attachments) {
      await prisma.submissionAttachment.create({
        data: {
          submissionRevisionId: submission.id,
          fileId: attachment.id,
          snapshotFileName: attachment.fileName,
          snapshotMimeType: attachment.mimeType,
          snapshotSizeBytes: attachment.sizeBytes,
        },
      });
    }

    for (const feedback of submission.feedbackHistory) {
      await prisma.submissionFeedbackEntry.create({
        data: {
          feedbackEntryId: feedback.id,
          submissionRevisionId: submission.id,
          reviewerUserId: feedback.reviewerId,
          reviewerNameSnapshot: feedback.reviewerName,
          messageFormat: feedback.messageFormat,
          entryType: feedback.entryType,
          message: feedback.message,
          code: feedback.code,
          codeLanguage: mapCodeLanguage(feedback.codeLanguage),
          createdAt: new Date(feedback.createdAt),
        },
      });
    }
  }

  for (const event of assignmentsDatabase.timeline) {
    await prisma.submissionTimelineEvent.create({
      data: {
        timelineEventId: event.id,
        submissionRevisionId: event.submissionId,
        eventType: event.type,
        actorUserId: event.actorId,
        actorNameSnapshot: event.actorName,
        note: event.note,
        createdAt: new Date(event.createdAt),
      },
    });
  }

  for (const auditEvent of adminSeed.courseAssignmentAuditEvents) {
    await prisma.courseAssignmentAuditEvent.create({
      data: {
        auditEventId: auditEvent.id,
        courseId: auditEvent.courseId,
        assignmentId: auditEvent.assignmentId,
        submissionRevisionId: auditEvent.submissionId,
        actorUserId: auditEvent.actorId,
        actorNameSnapshot: auditEvent.actorName,
        actorRole: auditEvent.actorRole,
        action: auditEvent.action,
        note: auditEvent.note,
        occurredAt: new Date(auditEvent.occurredAt),
      },
    });
  }
}

async function clearDatabase() {
  await prisma.feedbackAttachment.deleteMany();
  await prisma.submissionAttachment.deleteMany();
  await prisma.courseAssignmentAuditEvent.deleteMany();
  await prisma.submissionTimelineEvent.deleteMany();
  await prisma.submissionFeedbackEntry.deleteMany();
  await prisma.submissionRevision.deleteMany();
  await prisma.assignmentTemplate.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.attendanceScopePolicy.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.courseMember.deleteMany();
  await prisma.courseCurriculumPreview.deleteMany();
  await prisma.course.deleteMany();
  await prisma.file.deleteMany();
  await prisma.authRefreshSession.deleteMany();
  await prisma.user.deleteMany();
}

function mapUserRole(role: string) {
  return role.toUpperCase() as
    | "ADMIN"
    | "INSTRUCTOR"
    | "ASSISTANT"
    | "STUDENT";
}

function createSeedCredential(password: string, userId: string) {
  const passwordSalt = `seed-salt-${userId}`;
  return {
    passwordSalt,
    passwordHash: scryptSync(password, passwordSalt, 64).toString("hex"),
  };
}

function mapCourseLevel(level: string) {
  if (level === "입문") return "BEGINNER";
  if (level === "심화") return "ADVANCED";
  return "INTERMEDIATE";
}

function mapCodeLanguage(language: string) {
  switch (language) {
    case "typescript":
      return "TYPESCRIPT";
    case "javascript":
      return "JAVASCRIPT";
    case "python":
      return "PYTHON";
    case "java":
      return "JAVA";
    case "sql":
      return "SQL";
    case "markdown":
      return "MARKDOWN";
    default:
      return "PLAINTEXT";
  }
}

function findUserIdByName(
  users: ReturnType<typeof createFrontAlignedUserSeeds>,
  name: string,
) {
  return users.find((user) => user.userName === name)?.userId ?? "instructor-dev-01";
}

function findCourseIdByClassScope(
  courses: ReturnType<typeof createFrontAlignedAdminSeed>["courses"],
  classScope: string,
) {
  return courses.find((course) => course.classScope === classScope)?.courseId ?? null;
}

function normalizeScheduleKey(scheduleId: string) {
  if (scheduleId.startsWith("attendance-morning")) return "daily-check-in";
  if (scheduleId.startsWith("attendance-afternoon")) return "missed-check-in";
  return scheduleId;
}

function resolveScheduleIdFromKey(scheduleKey: string) {
  if (scheduleKey === "missed-check-in") {
    return "attendance-afternoon-missed";
  }

  if (scheduleKey === "daily-check-in") {
    return "attendance-morning-1";
  }

  return scheduleKey;
}

function buildSubmissionGroupId(submissionRevisionId: string) {
  const match = submissionRevisionId.match(/^(.*)-r\d+$/);
  return match?.[1] ?? submissionRevisionId;
}

function buildPersistedCourses(
  coursesDatabase: ReturnType<typeof createFrontAlignedCoursesDatabase>,
  adminSeed: ReturnType<typeof createFrontAlignedAdminSeed>,
  userSeeds: ReturnType<typeof createFrontAlignedUserSeeds>,
) {
  const courseById = new Map(
    coursesDatabase.courses.map((course) => [course.id, course]),
  );

  for (const adminCourse of adminSeed.courses) {
    if (courseById.has(adminCourse.courseId)) {
      continue;
    }

    const instructorUserId =
      adminSeed.memberBindings.find(
        (binding) => binding.courseId === adminCourse.courseId && binding.role === "INSTRUCTOR",
      )?.userId ?? "instructor-dev-01";
    const instructor = userSeeds.find((user) => user.userId === instructorUserId);

    courseById.set(adminCourse.courseId, {
      id: adminCourse.courseId,
      slug: adminCourse.classScope,
      title: adminCourse.courseTitle,
      subtitle: `${adminCourse.courseTitle} 운영 강의`,
      description: `${adminCourse.courseTitle} 과정을 운영용 데이터셋 기준으로 제공합니다.`,
      category: adminCourse.category,
      tags: [adminCourse.category, "LMS"],
      level: "중급",
      durationLabel: "12시간",
      lessonCount: 24,
      priceLabel: "월 구독 포함",
      rating: 4.8,
      reviewCount: 0,
      enrollmentCount: 0,
      thumbnailTone: "from-[#1f2937] via-[#374151] to-[#e5e7eb]",
      instructor: {
        name: instructor?.userName ?? "개발용 강사",
        title: instructor?.title ?? "Instructor",
      },
      enrollmentStatus: "NOT_ENROLLED",
      learningPoints: [
        `${adminCourse.courseTitle} 운영 흐름을 확인합니다.`,
        "강의, 수강, 출석 데이터를 함께 검증합니다.",
      ],
      curriculumPreview: [],
      classScope: adminCourse.classScope,
      lifecycleStatus: adminCourse.status,
      sectionLabel: adminCourse.sectionLabel,
      roomLabel: adminCourse.roomLabel,
      capacity: adminCourse.capacity,
      startDate: adminCourse.startDate,
      endDate: adminCourse.endDate,
      enrollmentStartDate: adminCourse.enrollmentStartDate,
      enrollmentEndDate: adminCourse.enrollmentEndDate,
    });
  }

  return [...courseById.values()];
}

function buildPersistedFiles(
  fileRecords: ReturnType<typeof createFrontAlignedFileRecords>,
  assignmentsDatabase: ReturnType<typeof createFrontAlignedAssignmentDatabase>,
) {
  const fileById = new Map(fileRecords.map((file) => [file.fileId, file]));

  for (const submission of assignmentsDatabase.submissions) {
    for (const attachment of submission.attachments) {
      if (fileById.has(attachment.id)) {
        continue;
      }

      fileById.set(attachment.id, {
        fileId: attachment.id,
        ownerId: submission.studentId,
        fileName: attachment.fileName,
        bucketKey: `${submission.studentId}/${attachment.id}/${attachment.fileName}`,
        contentType: attachment.mimeType,
        size: attachment.sizeBytes,
        checksum: attachment.id.padEnd(64, "0").slice(0, 64),
        status: "COMPLETED",
        uploadUrl: `https://storage.mock.local/upload/${encodeURIComponent(
          `${submission.studentId}/${attachment.id}/${attachment.fileName}`,
        )}?signature=seed-signature`,
        downloadUrl: `https://storage.mock.local/download/${encodeURIComponent(
          `${submission.studentId}/${attachment.id}/${attachment.fileName}`,
        )}`,
        createdAt: submission.submittedAt,
        completedAt: submission.submittedAt,
      });
    }
  }

  return [...fileById.values()];
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
