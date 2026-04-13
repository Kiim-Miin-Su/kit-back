import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { isPrismaDataSource } from "../common/data-source";
import { PrismaService } from "../prisma/prisma.service";
import {
  AdminAttendanceScopeWorkspaceResponse,
  AdminCourseAssignmentAuditEvent,
  AdminCourseMemberBinding,
  AdminCourseMemberRole,
  AdminCoursePacingType,
  AdminCourseWorkspaceCourse,
  AdminCourseWorkspaceUser,
  AdminScheduleEvent,
  AdminScheduleScopeRef,
  AdminScheduleVisibilityType,
  AdminScheduleWorkspaceResponse,
  AdminUsersWorkspaceResponse,
} from "./admin.types";
import { assertValidDateKey, parseIsoDateTime, toClassScope } from "./admin.validation";
import { CreateAdminCourseDto } from "./dto/create-admin-course.dto";
import { CreateAdminScheduleDto, UpdateAdminScheduleDto } from "./dto/create-admin-schedule.dto";
import { createFrontAlignedAdminSeed } from "../mock-data/front-aligned.mock";

@Injectable()
export class AdminService {
  private readonly users: AdminCourseWorkspaceUser[];
  private readonly courses: AdminCourseWorkspaceCourse[];
  private readonly courseAssignmentAuditEvents: AdminCourseAssignmentAuditEvent[];
  private memberBindings: AdminCourseMemberBinding[];
  private schedules: AdminScheduleEvent[];
  private readonly attendanceScopePolicies = new Map<string, string[]>();

  constructor(private readonly prisma: PrismaService) {
    const seed = createFrontAlignedAdminSeed();
    this.users = seed.users;
    this.courses = seed.courses;
    this.memberBindings = seed.memberBindings;
    this.schedules = seed.schedules;
    this.courseAssignmentAuditEvents = seed.courseAssignmentAuditEvents;

    for (const course of this.courses) {
      this.attendanceScopePolicies.set(course.courseId, ["global", course.classScope]);
    }
  }

  async getUsersWorkspace(): Promise<AdminUsersWorkspaceResponse> {
    if (!isPrismaDataSource()) {
      return {
        courses: this.cloneCourses(),
        users: this.cloneUsers(),
        memberBindings: this.cloneMemberBindings(),
      };
    }

    const [users, courses, memberBindings] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: [{ name: "asc" }],
        select: { userId: true, name: true, birthDate: true, title: true, role: true },
      }),
      this.prisma.course.findMany({
        orderBy: [{ createdAt: "asc" }],
      }),
      this.prisma.courseMember.findMany({
        orderBy: [{ createdAt: "asc" }],
      }),
    ]);

    return {
      users: users.map((u) => ({
        userId: u.userId,
        userName: u.name,
        birthDate: u.birthDate ?? undefined,
        title: u.title,
        defaultRole: this.mapPrismaRoleToAdminRole(u.role),
      })),
      courses: courses.map(this.mapPrismaCourseToAdmin),
      memberBindings: memberBindings.map((m) => ({
        courseId: m.courseId,
        userId: m.userId,
        role: m.role as AdminCourseMemberRole,
      })),
    };
  }

  async searchUsers(query?: string): Promise<AdminCourseWorkspaceUser[]> {
    const normalized = (query ?? "").trim().toLowerCase();

    if (!isPrismaDataSource()) {
      if (normalized.length === 0) return this.cloneUsers();
      return this.users
        .filter((user) => {
          const userId = user.userId.toLowerCase();
          const userName = user.userName.toLowerCase();
          const birthDate = (user.birthDate ?? "").toLowerCase();
          return (
            userId === normalized ||
            userId.startsWith(normalized) ||
            userName.includes(normalized) ||
            birthDate === normalized ||
            birthDate.includes(normalized)
          );
        })
        .map((user) => ({ ...user }));
    }

    const users = await this.prisma.user.findMany({
      where:
        normalized.length === 0
          ? {}
          : {
              OR: [
                { userId: { startsWith: normalized } },
                { name: { contains: normalized, mode: "insensitive" } },
                { birthDate: { contains: normalized } },
              ],
            },
      orderBy: [{ name: "asc" }],
      select: { userId: true, name: true, birthDate: true, title: true, role: true },
    });

    return users.map((u) => ({
      userId: u.userId,
      userName: u.name,
      birthDate: u.birthDate ?? undefined,
      title: u.title,
      defaultRole: this.mapPrismaRoleToAdminRole(u.role),
    }));
  }

  async createCourse(input: CreateAdminCourseDto): Promise<AdminCourseWorkspaceCourse> {
    this.assertCourseDateWindow(input);

    const courseTitle = input.courseTitle.trim();

    if (courseTitle.length === 0) {
      throw new BadRequestException({
        code: "INVALID_COURSE_TITLE",
        message: "courseTitle은 비어 있을 수 없습니다.",
      });
    }

    const capacity = input.capacity ?? 30;

    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new BadRequestException({
        code: "INVALID_CAPACITY",
        message: "정원은 1명 이상의 정수여야 합니다.",
      });
    }

    const courseId = `course-${Date.now().toString(36)}`;
    const classScope = toClassScope(courseId, courseTitle);
    const todayKey = this.toTodayDateKey();

    const created: AdminCourseWorkspaceCourse = {
      courseId,
      courseTitle,
      category: input.category.trim() || "기타",
      classScope,
      status: input.startDate > todayKey ? "PENDING" : "ACTIVE",
      sectionLabel: input.sectionLabel?.trim() || "신규 반",
      roomLabel: input.roomLabel?.trim() || "장소 미정",
      capacity,
      startDate: input.startDate,
      endDate: input.endDate,
      enrollmentStartDate: input.enrollmentStartDate,
      enrollmentEndDate: input.enrollmentEndDate,
      pacingType: input.pacingType as AdminCoursePacingType,
    };

    if (!isPrismaDataSource()) {
      this.courses.push(created);
      this.attendanceScopePolicies.set(created.courseId, ["global", created.classScope]);
      return { ...created };
    }

    const instructorUserId = await this.resolveDefaultInstructorUserId();

    await this.prisma.$transaction([
      this.prisma.course.create({
        data: {
          courseId: created.courseId,
          slug: created.courseId,
          title: created.courseTitle,
          subtitle: "",
          description: "",
          category: created.category,
          tags: [],
          level: "INTERMEDIATE",
          durationLabel: "",
          lessonCount: 0,
          priceLabel: "",
          rating: 0,
          reviewCount: 0,
          enrollmentCount: 0,
          thumbnailTone: "primary",
          instructorUserId,
          classScope: created.classScope,
          status: created.status,
          sectionLabel: created.sectionLabel,
          roomLabel: created.roomLabel,
          capacity: created.capacity,
          startDate: created.startDate,
          endDate: created.endDate,
          enrollmentStartDate: created.enrollmentStartDate,
          enrollmentEndDate: created.enrollmentEndDate,
          pacingType: created.pacingType,
          learningPoints: [],
        },
      }),
      this.prisma.attendanceScopePolicy.createMany({
        data: [
          { courseId: created.courseId, scope: "global" },
          { courseId: created.courseId, scope: created.classScope },
        ],
        skipDuplicates: true,
      }),
    ]);

    return { ...created };
  }

  async deleteCourse(courseId: string): Promise<void> {
    if (!isPrismaDataSource()) {
      const targetIndex = this.courses.findIndex((course) => course.courseId === courseId);

      if (targetIndex < 0) {
        throw new NotFoundException({
          code: "COURSE_NOT_FOUND",
          message: `courseId=${courseId} 수업을 찾을 수 없습니다.`,
        });
      }

      const [deletedCourse] = this.courses.splice(targetIndex, 1);
      this.memberBindings = this.memberBindings.filter((binding) => binding.courseId !== courseId);
      this.schedules = this.schedules.filter(
        (schedule) =>
          !(
            schedule.visibilityType === "class" && schedule.visibilityScope === deletedCourse.classScope
          ),
      );
      this.courseAssignmentAuditEvents.splice(
        0,
        this.courseAssignmentAuditEvents.length,
        ...this.courseAssignmentAuditEvents.filter((event) => event.courseId !== courseId),
      );
      this.attendanceScopePolicies.delete(courseId);
      return;
    }

    const found = await this.prisma.course.findUnique({ where: { courseId } });

    if (!found) {
      throw new NotFoundException({
        code: "COURSE_NOT_FOUND",
        message: `courseId=${courseId} 수업을 찾을 수 없습니다.`,
      });
    }

    await this.prisma.course.delete({ where: { courseId } });
  }

  async upsertCourseMemberRole(
    courseId: string,
    userId: string,
    role: AdminCourseMemberRole,
  ): Promise<AdminCourseMemberBinding> {
    if (!isPrismaDataSource()) {
      const targetCourse = this.courses.find((course) => course.courseId === courseId);

      if (!targetCourse) {
        throw new NotFoundException({
          code: "COURSE_NOT_FOUND",
          message: `courseId=${courseId} 수업을 찾을 수 없습니다.`,
        });
      }

      const targetUser = this.users.find((user) => user.userId === userId);

      if (!targetUser) {
        throw new NotFoundException({
          code: "USER_NOT_FOUND",
          message: `userId=${userId} 사용자를 찾을 수 없습니다.`,
        });
      }

      const existingIndex = this.memberBindings.findIndex(
        (binding) => binding.courseId === courseId && binding.userId === userId,
      );
      const existing = existingIndex >= 0 ? this.memberBindings[existingIndex] : undefined;

      if (role === "STUDENT") {
        const currentStudentCount = this.memberBindings.filter(
          (binding) => binding.courseId === courseId && binding.role === "STUDENT",
        ).length;
        const shouldIncreaseStudentCount = existing?.role !== "STUDENT";

        if (shouldIncreaseStudentCount && currentStudentCount >= targetCourse.capacity) {
          throw new ConflictException({
            code: "COURSE_CAPACITY_EXCEEDED",
            message: `정원(${targetCourse.capacity}명)을 초과할 수 없습니다.`,
          });
        }
      }

      const next: AdminCourseMemberBinding = { courseId, userId, role };

      if (existingIndex >= 0) {
        this.memberBindings[existingIndex] = next;
      } else {
        this.memberBindings.push(next);
      }

      return { ...next };
    }

    const [course, user] = await Promise.all([
      this.prisma.course.findUnique({ where: { courseId }, select: { capacity: true, courseId: true } }),
      this.prisma.user.findUnique({ where: { userId }, select: { userId: true } }),
    ]);

    if (!course) {
      throw new NotFoundException({
        code: "COURSE_NOT_FOUND",
        message: `courseId=${courseId} 수업을 찾을 수 없습니다.`,
      });
    }

    if (!user) {
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: `userId=${userId} 사용자를 찾을 수 없습니다.`,
      });
    }

    if (role === "STUDENT") {
      const [existing, studentCount] = await Promise.all([
        this.prisma.courseMember.findUnique({
          where: { courseId_userId: { courseId, userId } },
          select: { role: true },
        }),
        this.prisma.courseMember.count({ where: { courseId, role: "STUDENT" } }),
      ]);

      if (existing?.role !== "STUDENT" && studentCount >= course.capacity) {
        throw new ConflictException({
          code: "COURSE_CAPACITY_EXCEEDED",
          message: `정원(${course.capacity}명)을 초과할 수 없습니다.`,
        });
      }
    }

    await this.prisma.courseMember.upsert({
      where: { courseId_userId: { courseId, userId } },
      create: { courseId, userId, role },
      update: { role },
    });

    return { courseId, userId, role };
  }

  async deleteCourseMember(courseId: string, userId: string): Promise<void> {
    if (!isPrismaDataSource()) {
      const targetCourse = this.courses.find((course) => course.courseId === courseId);

      if (!targetCourse) {
        throw new NotFoundException({
          code: "COURSE_NOT_FOUND",
          message: `courseId=${courseId} 수업을 찾을 수 없습니다.`,
        });
      }

      this.memberBindings = this.memberBindings.filter(
        (binding) => !(binding.courseId === courseId && binding.userId === userId),
      );
      return;
    }

    const course = await this.prisma.course.findUnique({ where: { courseId }, select: { courseId: true } });

    if (!course) {
      throw new NotFoundException({
        code: "COURSE_NOT_FOUND",
        message: `courseId=${courseId} 수업을 찾을 수 없습니다.`,
      });
    }

    await this.prisma.courseMember.deleteMany({ where: { courseId, userId } });
  }

  async getScheduleWorkspace(): Promise<AdminScheduleWorkspaceResponse> {
    if (!isPrismaDataSource()) {
      return {
        schedules: this.schedules
          .map((schedule) => ({ ...schedule }))
          .sort((a, b) => this.compareByDateAndTime(a, b)),
        scopes: this.buildScheduleScopes(),
      };
    }

    const [schedules, courses] = await Promise.all([
      this.prisma.schedule.findMany({
        orderBy: [{ dateKey: "asc" }, { timeLabel: "asc" }],
      }),
      this.prisma.course.findMany({
        select: { courseId: true, title: true, classScope: true },
      }),
    ]);

    const mappedSchedules = schedules.map((s) => this.mapPrismaScheduleToAdmin(s));
    const scopes = this.buildScheduleScopesFromPrisma(mappedSchedules, courses);

    return { schedules: mappedSchedules, scopes };
  }

  /**
   * 학생 출석 워크스페이스에 포함할 커스텀 일정을 반환합니다.
   * - visibilityType === "global" 이거나 scopes에 visibilityScope가 포함된 CUSTOM 일정만 반환
   */
  getCustomSchedulesForScopes(scopes: string[]): AdminScheduleEvent[] {
    const scopeSet = new Set(scopes);
    return this.schedules
      .filter(
        (schedule) =>
          schedule.sourceType === "CUSTOM" &&
          (schedule.visibilityType === "global" || scopeSet.has(schedule.visibilityScope)),
      )
      .map((schedule) => ({ ...schedule }));
  }

  async createSchedule(input: CreateAdminScheduleDto): Promise<AdminScheduleEvent> {
    await this.assertScheduleInput(input);

    const attendanceWindowLabel =
      input.requiresAttendanceCheck && input.attendanceWindowEndAt
        ? `${this.formatTimeLabel(input.attendanceWindowEndAt)}까지 인증 가능`
        : undefined;

    const scheduleId = `schedule-custom-${Date.now().toString(36)}`;

    const created: AdminScheduleEvent = {
      id: scheduleId,
      title: input.title.trim(),
      categoryLabel: input.categoryLabel.trim() || "운영",
      dateKey: input.dateKey,
      dateLabel: this.buildDateLabel(input.dateKey),
      timeLabel: input.timeLabel.trim() || "시간 미정",
      locationLabel: input.locationLabel.trim() || "장소 미정",
      visibilityType: input.visibilityType,
      visibilityScope: input.visibilityScope,
      visibilityLabel: input.visibilityLabel.trim() || this.buildVisibilityLabelSync(input.visibilityScope),
      requiresAttendanceCheck: input.requiresAttendanceCheck,
      attendanceWindowStartAt: input.attendanceWindowStartAt,
      attendanceWindowEndAt: input.attendanceWindowEndAt,
      attendanceWindowLabel,
      sourceType: "CUSTOM",
    };

    if (!isPrismaDataSource()) {
      this.schedules.push(created);
      return { ...created };
    }

    const courseId = await this.resolveCourseIdByClassScope(input.visibilityScope);

    await this.prisma.schedule.create({
      data: {
        scheduleId,
        courseId,
        title: created.title,
        categoryLabel: created.categoryLabel,
        dateKey: created.dateKey,
        dateLabel: created.dateLabel,
        timeLabel: created.timeLabel,
        locationLabel: created.locationLabel,
        visibilityType: input.visibilityType === "global" ? "GLOBAL" : "CLASS",
        visibilityScope: created.visibilityScope,
        visibilityLabel: created.visibilityLabel,
        requiresAttendanceCheck: created.requiresAttendanceCheck,
        attendanceWindowStartAt: created.attendanceWindowStartAt
          ? new Date(created.attendanceWindowStartAt)
          : null,
        attendanceWindowEndAt: created.attendanceWindowEndAt
          ? new Date(created.attendanceWindowEndAt)
          : null,
        attendanceWindowLabel: created.attendanceWindowLabel,
        sourceType: "CUSTOM",
      },
    });

    return { ...created };
  }

  async updateSchedule(scheduleId: string, input: UpdateAdminScheduleDto): Promise<AdminScheduleEvent> {
    await this.assertScheduleInput(input);

    const attendanceWindowLabel =
      input.requiresAttendanceCheck && input.attendanceWindowEndAt
        ? `${this.formatTimeLabel(input.attendanceWindowEndAt)}까지 인증 가능`
        : undefined;

    if (!isPrismaDataSource()) {
      const targetIndex = this.schedules.findIndex((schedule) => schedule.id === scheduleId);

      if (targetIndex < 0) {
        throw new NotFoundException({
          code: "SCHEDULE_NOT_FOUND",
          message: `scheduleId=${scheduleId} 일정을 찾을 수 없습니다.`,
        });
      }

      const previous = this.schedules[targetIndex];
      const updated: AdminScheduleEvent = {
        ...previous,
        title: input.title.trim(),
        categoryLabel: input.categoryLabel.trim() || "운영",
        dateKey: input.dateKey,
        dateLabel: this.buildDateLabel(input.dateKey),
        timeLabel: input.timeLabel.trim() || "시간 미정",
        locationLabel: input.locationLabel.trim() || "장소 미정",
        visibilityType: input.visibilityType,
        visibilityScope: input.visibilityScope,
        visibilityLabel: input.visibilityLabel.trim() || this.buildVisibilityLabelSync(input.visibilityScope),
        requiresAttendanceCheck: input.requiresAttendanceCheck,
        attendanceWindowStartAt: input.attendanceWindowStartAt,
        attendanceWindowEndAt: input.attendanceWindowEndAt,
        attendanceWindowLabel,
        sourceType: previous.sourceType,
      };

      this.schedules[targetIndex] = updated;
      return { ...updated };
    }

    const found = await this.prisma.schedule.findUnique({
      where: { scheduleId },
    });

    if (!found) {
      throw new NotFoundException({
        code: "SCHEDULE_NOT_FOUND",
        message: `scheduleId=${scheduleId} 일정을 찾을 수 없습니다.`,
      });
    }

    const courseId = await this.resolveCourseIdByClassScope(input.visibilityScope);
    const visibilityLabel =
      input.visibilityLabel.trim() || this.buildVisibilityLabelSync(input.visibilityScope);

    const updated = await this.prisma.schedule.update({
      where: { scheduleId },
      data: {
        courseId,
        title: input.title.trim(),
        categoryLabel: input.categoryLabel.trim() || "운영",
        dateKey: input.dateKey,
        dateLabel: this.buildDateLabel(input.dateKey),
        timeLabel: input.timeLabel.trim() || "시간 미정",
        locationLabel: input.locationLabel.trim() || "장소 미정",
        visibilityType: input.visibilityType === "global" ? "GLOBAL" : "CLASS",
        visibilityScope: input.visibilityScope,
        visibilityLabel,
        requiresAttendanceCheck: input.requiresAttendanceCheck,
        attendanceWindowStartAt: input.attendanceWindowStartAt
          ? new Date(input.attendanceWindowStartAt)
          : null,
        attendanceWindowEndAt: input.attendanceWindowEndAt
          ? new Date(input.attendanceWindowEndAt)
          : null,
        attendanceWindowLabel,
      },
    });

    return this.mapPrismaScheduleToAdmin(updated);
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    if (!isPrismaDataSource()) {
      const targetIndex = this.schedules.findIndex((schedule) => schedule.id === scheduleId);

      if (targetIndex < 0) {
        throw new NotFoundException({
          code: "SCHEDULE_NOT_FOUND",
          message: `scheduleId=${scheduleId} 일정을 찾을 수 없습니다.`,
        });
      }

      this.schedules.splice(targetIndex, 1);
      return;
    }

    const found = await this.prisma.schedule.findUnique({
      where: { scheduleId },
      select: { scheduleId: true },
    });

    if (!found) {
      throw new NotFoundException({
        code: "SCHEDULE_NOT_FOUND",
        message: `scheduleId=${scheduleId} 일정을 찾을 수 없습니다.`,
      });
    }

    await this.prisma.schedule.delete({ where: { scheduleId } });
  }

  async getAttendanceScopeWorkspace(courseId: string): Promise<AdminAttendanceScopeWorkspaceResponse> {
    if (!isPrismaDataSource()) {
      const course = this.courses.find((item) => item.courseId === courseId);

      if (!course) {
        throw new NotFoundException({
          code: "COURSE_NOT_FOUND",
          message: `courseId=${courseId} 수업을 찾을 수 없습니다.`,
        });
      }

      const availableScopes = this.buildScheduleScopes();
      const requestedScopes = this.attendanceScopePolicies.get(courseId) ?? [
        "global",
        course.classScope,
      ];
      const allowedScheduleScopes = this.normalizeAllowedScopes(
        requestedScopes,
        availableScopes,
        course.classScope,
      );

      this.attendanceScopePolicies.set(courseId, allowedScheduleScopes);

      return {
        courseId: course.courseId,
        courseTitle: course.courseTitle,
        classScope: course.classScope,
        availableScopes,
        allowedScheduleScopes,
      };
    }

    const [course, scopePolicies, schedules, courses] = await Promise.all([
      this.prisma.course.findUnique({
        where: { courseId },
        select: { courseId: true, title: true, classScope: true },
      }),
      this.prisma.attendanceScopePolicy.findMany({ where: { courseId } }),
      this.prisma.schedule.findMany({ select: { visibilityType: true, visibilityScope: true, visibilityLabel: true } }),
      this.prisma.course.findMany({ select: { courseId: true, title: true, classScope: true } }),
    ]);

    if (!course) {
      throw new NotFoundException({
        code: "COURSE_NOT_FOUND",
        message: `courseId=${courseId} 수업을 찾을 수 없습니다.`,
      });
    }

    const availableScopes = this.buildScheduleScopesFromPrisma(
      schedules.map((s) => ({
        visibilityType: (s.visibilityType === "GLOBAL" ? "global" : "class") as AdminScheduleVisibilityType,
        visibilityScope: s.visibilityScope,
        visibilityLabel: s.visibilityLabel,
      })) as AdminScheduleEvent[],
      courses,
    );

    const requestedScopes =
      scopePolicies.length > 0 ? scopePolicies.map((p) => p.scope) : ["global", course.classScope];
    const allowedScheduleScopes = this.normalizeAllowedScopes(
      requestedScopes,
      availableScopes,
      course.classScope,
    );

    return {
      courseId: course.courseId,
      courseTitle: course.title,
      classScope: course.classScope,
      availableScopes,
      allowedScheduleScopes,
    };
  }

  async updateAttendanceScopes(
    courseId: string,
    requestedScopes: string[],
  ): Promise<AdminAttendanceScopeWorkspaceResponse> {
    const workspace = await this.getAttendanceScopeWorkspace(courseId);
    const allowedScheduleScopes = this.normalizeAllowedScopes(
      requestedScopes,
      workspace.availableScopes,
      workspace.classScope,
    );

    if (!isPrismaDataSource()) {
      this.attendanceScopePolicies.set(courseId, allowedScheduleScopes);
    } else {
      await this.prisma.$transaction([
        this.prisma.attendanceScopePolicy.deleteMany({ where: { courseId } }),
        this.prisma.attendanceScopePolicy.createMany({
          data: allowedScheduleScopes.map((scope) => ({ courseId, scope })),
        }),
      ]);
    }

    return { ...workspace, allowedScheduleScopes };
  }

  async getCourseAssignmentAudit(courseId: string): Promise<AdminCourseAssignmentAuditEvent[]> {
    if (!isPrismaDataSource()) {
      const exists = this.courses.some((course) => course.courseId === courseId);

      if (!exists) {
        throw new NotFoundException({
          code: "COURSE_NOT_FOUND",
          message: `courseId=${courseId} 수업을 찾을 수 없습니다.`,
        });
      }

      return this.courseAssignmentAuditEvents
        .filter((event) => event.courseId === courseId)
        .sort((a, b) => Number(new Date(b.occurredAt)) - Number(new Date(a.occurredAt)))
        .map((event) => ({ ...event }));
    }

    const course = await this.prisma.course.findUnique({
      where: { courseId },
      select: { courseId: true },
    });

    if (!course) {
      throw new NotFoundException({
        code: "COURSE_NOT_FOUND",
        message: `courseId=${courseId} 수업을 찾을 수 없습니다.`,
      });
    }

    const events = await this.prisma.courseAssignmentAuditEvent.findMany({
      where: { courseId },
      include: { assignment: { select: { title: true } } },
      orderBy: { occurredAt: "desc" },
    });

    return events.map((e) => ({
      id: e.auditEventId,
      courseId: e.courseId,
      assignmentId: e.assignmentId,
      assignmentTitle: e.assignment.title,
      submissionId: e.submissionRevisionId ?? undefined,
      actorId: e.actorUserId,
      actorName: e.actorNameSnapshot,
      actorRole: e.actorRole as AdminCourseAssignmentAuditEvent["actorRole"],
      action: e.action as AdminCourseAssignmentAuditEvent["action"],
      occurredAt: e.occurredAt.toISOString(),
      note: e.note ?? undefined,
    }));
  }

  async recordCourseAssignmentAuditEvent(
    input: Omit<AdminCourseAssignmentAuditEvent, "id" | "occurredAt"> & {
      id?: string;
      occurredAt?: string;
    },
  ): Promise<void> {
    const exists = isPrismaDataSource()
      ? !!(await this.prisma.course.findUnique({
          where: { courseId: input.courseId },
          select: { courseId: true },
        }))
      : this.courses.some((course) => course.courseId === input.courseId);

    if (!exists) return;

    if (!isPrismaDataSource()) {
      const next: AdminCourseAssignmentAuditEvent = {
        id: input.id ?? `audit-${Date.now().toString(36)}`,
        occurredAt: input.occurredAt ?? new Date().toISOString(),
        ...input,
      };
      this.courseAssignmentAuditEvents.unshift(next);
      return;
    }

    await this.prisma.courseAssignmentAuditEvent.create({
      data: {
        auditEventId: input.id ?? `audit-${Date.now().toString(36)}`,
        courseId: input.courseId,
        assignmentId: input.assignmentId,
        submissionRevisionId: input.submissionId ?? null,
        actorUserId: input.actorId,
        actorNameSnapshot: input.actorName,
        actorRole: input.actorRole,
        action: input.action,
        note: input.note ?? null,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
      },
    });
  }

  private assertCourseDateWindow(input: {
    startDate: string;
    endDate: string;
    enrollmentStartDate: string;
    enrollmentEndDate: string;
  }) {
    assertValidDateKey(input.startDate, "INVALID_DATE_WINDOW");
    assertValidDateKey(input.endDate, "INVALID_DATE_WINDOW");
    assertValidDateKey(input.enrollmentStartDate, "INVALID_DATE_WINDOW");
    assertValidDateKey(input.enrollmentEndDate, "INVALID_DATE_WINDOW");

    const start = this.parseDateKey(input.startDate);
    const end = this.parseDateKey(input.endDate);
    const enrollmentStart = this.parseDateKey(input.enrollmentStartDate);
    const enrollmentEnd = this.parseDateKey(input.enrollmentEndDate);

    if (start.getTime() > end.getTime()) {
      throw new BadRequestException({
        code: "INVALID_DATE_WINDOW",
        message: "startDate는 endDate보다 늦을 수 없습니다.",
      });
    }

    if (enrollmentStart.getTime() > enrollmentEnd.getTime()) {
      throw new BadRequestException({
        code: "INVALID_DATE_WINDOW",
        message: "enrollmentStartDate는 enrollmentEndDate보다 늦을 수 없습니다.",
      });
    }

    if (enrollmentEnd.getTime() > end.getTime()) {
      throw new BadRequestException({
        code: "INVALID_DATE_WINDOW",
        message: "enrollmentEndDate는 수업 종료일보다 늦을 수 없습니다.",
      });
    }
  }

  private async assertScheduleInput(input: CreateAdminScheduleDto | UpdateAdminScheduleDto) {
    assertValidDateKey(input.dateKey, "INVALID_SCHEDULE_DATE");

    const title = input.title.trim();

    if (title.length === 0) {
      throw new BadRequestException({
        code: "INVALID_SCHEDULE_TITLE",
        message: "title은 비어 있을 수 없습니다.",
      });
    }

    const visibilityScope = input.visibilityScope.trim();

    if (visibilityScope.length === 0) {
      throw new BadRequestException({
        code: "INVALID_SCHEDULE_SCOPE",
        message: "visibilityScope는 비어 있을 수 없습니다.",
      });
    }

    if (input.visibilityType === "global" && visibilityScope !== "global") {
      throw new BadRequestException({
        code: "INVALID_SCHEDULE_SCOPE",
        message: "global 일정은 visibilityScope가 global이어야 합니다.",
      });
    }

    if (input.visibilityType === "class") {
      const classExists = isPrismaDataSource()
        ? !!(await this.prisma.course.findUnique({
            where: { classScope: visibilityScope },
            select: { courseId: true },
          }))
        : this.courses.some((course) => course.classScope === visibilityScope);

      if (!classExists) {
        throw new BadRequestException({
          code: "INVALID_SCHEDULE_SCOPE",
          message: `${visibilityScope} 는 등록된 class scope가 아닙니다.`,
        });
      }
    }

    const attendanceStart = input.attendanceWindowStartAt
      ? parseIsoDateTime(input.attendanceWindowStartAt, "INVALID_ATTENDANCE_WINDOW")
      : undefined;
    const attendanceEnd = input.attendanceWindowEndAt
      ? parseIsoDateTime(input.attendanceWindowEndAt, "INVALID_ATTENDANCE_WINDOW")
      : undefined;

    if (input.requiresAttendanceCheck && !attendanceEnd) {
      throw new BadRequestException({
        code: "INVALID_ATTENDANCE_WINDOW",
        message: "출석 인증이 필요한 일정은 attendanceWindowEndAt이 필수입니다.",
      });
    }

    if (attendanceStart && attendanceEnd && attendanceStart.getTime() > attendanceEnd.getTime()) {
      throw new BadRequestException({
        code: "INVALID_ATTENDANCE_WINDOW",
        message: "attendanceWindowStartAt은 attendanceWindowEndAt보다 늦을 수 없습니다.",
      });
    }
  }

  private async resolveDefaultInstructorUserId(): Promise<string> {
    const instructor = await this.prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "INSTRUCTOR"] } },
      select: { userId: true },
      orderBy: { createdAt: "asc" },
    });
    return instructor?.userId ?? "instructor-dev-01";
  }

  private async resolveCourseIdByClassScope(scope: string): Promise<string | null> {
    if (scope === "global") return null;

    const course = await this.prisma.course.findUnique({
      where: { classScope: scope },
      select: { courseId: true },
    });
    return course?.courseId ?? null;
  }

  private mapPrismaCourseToAdmin = (course: {
    courseId: string;
    title: string;
    category: string;
    classScope: string;
    status: string;
    sectionLabel: string;
    roomLabel: string;
    capacity: number;
    startDate: string;
    endDate: string;
    enrollmentStartDate: string;
    enrollmentEndDate: string;
    pacingType: string;
  }): AdminCourseWorkspaceCourse => ({
    courseId: course.courseId,
    courseTitle: course.title,
    category: course.category,
    classScope: course.classScope,
    status: course.status as "ACTIVE" | "PENDING",
    sectionLabel: course.sectionLabel,
    roomLabel: course.roomLabel,
    capacity: course.capacity,
    startDate: course.startDate,
    endDate: course.endDate,
    enrollmentStartDate: course.enrollmentStartDate,
    enrollmentEndDate: course.enrollmentEndDate,
    pacingType: course.pacingType as AdminCoursePacingType,
  });

  private mapPrismaScheduleToAdmin = (s: {
    scheduleId: string;
    title: string;
    categoryLabel: string;
    dateKey: string;
    dateLabel: string;
    timeLabel: string;
    locationLabel: string;
    visibilityType: string;
    visibilityScope: string;
    visibilityLabel: string;
    requiresAttendanceCheck: boolean;
    attendanceWindowStartAt: Date | null;
    attendanceWindowEndAt: Date | null;
    attendanceWindowLabel: string | null;
    sourceType: string;
  }): AdminScheduleEvent => ({
    id: s.scheduleId,
    title: s.title,
    categoryLabel: s.categoryLabel,
    dateKey: s.dateKey,
    dateLabel: s.dateLabel,
    timeLabel: s.timeLabel,
    locationLabel: s.locationLabel,
    visibilityType: (s.visibilityType === "GLOBAL" ? "global" : "class") as AdminScheduleVisibilityType,
    visibilityScope: s.visibilityScope,
    visibilityLabel: s.visibilityLabel,
    requiresAttendanceCheck: s.requiresAttendanceCheck,
    attendanceWindowStartAt: s.attendanceWindowStartAt?.toISOString(),
    attendanceWindowEndAt: s.attendanceWindowEndAt?.toISOString(),
    attendanceWindowLabel: s.attendanceWindowLabel ?? undefined,
    sourceType: s.sourceType as "SYSTEM" | "CUSTOM",
  });

  private mapPrismaRoleToAdminRole(role: string): AdminCourseMemberRole {
    if (role === "INSTRUCTOR") return "INSTRUCTOR";
    if (role === "ASSISTANT") return "ASSISTANT";
    return "STUDENT";
  }

  private buildScheduleScopes(): AdminScheduleScopeRef[] {
    const map = new Map<string, AdminScheduleScopeRef>();

    map.set("global:global", {
      visibilityType: "global",
      visibilityScope: "global",
      visibilityLabel: "학원 전체 행사",
    });

    for (const course of this.courses) {
      map.set(`class:${course.classScope}`, {
        visibilityType: "class",
        visibilityScope: course.classScope,
        visibilityLabel: `${course.courseTitle} 수업`,
      });
    }

    for (const schedule of this.schedules) {
      const key = `${schedule.visibilityType}:${schedule.visibilityScope}`;

      if (!map.has(key)) {
        map.set(key, {
          visibilityType: schedule.visibilityType,
          visibilityScope: schedule.visibilityScope,
          visibilityLabel:
            schedule.visibilityLabel ||
            (schedule.visibilityType === "global" ? "학원 전체 행사" : schedule.visibilityScope),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.visibilityLabel.localeCompare(b.visibilityLabel, "ko"),
    );
  }

  private buildScheduleScopesFromPrisma(
    schedules: Pick<AdminScheduleEvent, "visibilityType" | "visibilityScope" | "visibilityLabel">[],
    courses: { courseId: string; title: string; classScope: string }[],
  ): AdminScheduleScopeRef[] {
    const map = new Map<string, AdminScheduleScopeRef>();

    map.set("global:global", {
      visibilityType: "global",
      visibilityScope: "global",
      visibilityLabel: "학원 전체 행사",
    });

    for (const course of courses) {
      map.set(`class:${course.classScope}`, {
        visibilityType: "class",
        visibilityScope: course.classScope,
        visibilityLabel: `${course.title} 수업`,
      });
    }

    for (const s of schedules) {
      const key = `${s.visibilityType}:${s.visibilityScope}`;

      if (!map.has(key)) {
        map.set(key, {
          visibilityType: s.visibilityType,
          visibilityScope: s.visibilityScope,
          visibilityLabel:
            s.visibilityLabel ||
            (s.visibilityType === "global" ? "학원 전체 행사" : s.visibilityScope),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.visibilityLabel.localeCompare(b.visibilityLabel, "ko"),
    );
  }

  private normalizeAllowedScopes(
    requestedScopes: string[],
    availableScopes: AdminScheduleScopeRef[],
    classScope: string,
  ) {
    const available = new Set(availableScopes.map((scope) => scope.visibilityScope));
    const normalized = requestedScopes.filter((scope) => available.has(scope));

    if (!normalized.includes("global")) {
      normalized.unshift("global");
    }

    if (!normalized.includes(classScope)) {
      normalized.push(classScope);
    }

    return Array.from(new Set(normalized));
  }

  private buildVisibilityLabelSync(scope: string) {
    if (scope === "global") return "학원 전체 행사";

    const course = this.courses.find((item) => item.classScope === scope);
    return course ? `${course.courseTitle} 수업` : scope;
  }

  private parseDateKey(value: string): Date {
    const [yearRaw, monthRaw, dayRaw] = value.split("-");
    return new Date(Date.UTC(Number(yearRaw), Number(monthRaw) - 1, Number(dayRaw)));
  }

  private buildDateLabel(dateKey: string) {
    const parsed = this.parseDateKey(dateKey);

    if (Number.isNaN(parsed.getTime())) {
      return dateKey;
    }

    const month = parsed.getUTCMonth() + 1;
    const day = parsed.getUTCDate();
    const weekday = new Intl.DateTimeFormat("ko-KR", {
      weekday: "short",
      timeZone: "Asia/Seoul",
    }).format(parsed);

    return `${month}월 ${day}일 ${weekday}`;
  }

  private formatTimeLabel(value: string) {
    const parsed = parseIsoDateTime(value, "INVALID_ATTENDANCE_WINDOW");

    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Seoul",
    }).format(parsed);
  }

  private toTodayDateKey() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private compareByDateAndTime(a: AdminScheduleEvent, b: AdminScheduleEvent) {
    if (a.dateKey === b.dateKey) {
      return a.timeLabel.localeCompare(b.timeLabel, "ko");
    }

    return a.dateKey.localeCompare(b.dateKey, "ko");
  }

  private cloneCourses() {
    return this.courses.map((course) => ({ ...course }));
  }

  private cloneUsers() {
    return this.users.map((user) => ({ ...user }));
  }

  private cloneMemberBindings() {
    return this.memberBindings.map((binding) => ({ ...binding }));
  }
}
