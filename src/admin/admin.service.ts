import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
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

  constructor() {
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

  getUsersWorkspace(): AdminUsersWorkspaceResponse {
    return {
      courses: this.cloneCourses(),
      users: this.cloneUsers(),
      memberBindings: this.cloneMemberBindings(),
    };
  }

  searchUsers(query?: string): AdminCourseWorkspaceUser[] {
    const normalized = (query ?? "").trim().toLowerCase();

    if (normalized.length === 0) {
      return this.cloneUsers();
    }

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

  createCourse(input: CreateAdminCourseDto): AdminCourseWorkspaceCourse {
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

    this.courses.push(created);
    this.attendanceScopePolicies.set(created.courseId, ["global", created.classScope]);
    return { ...created };
  }

  deleteCourse(courseId: string) {
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
          schedule.visibilityType === "class" &&
          schedule.visibilityScope === deletedCourse.classScope
        ),
    );
    this.courseAssignmentAuditEvents.splice(
      0,
      this.courseAssignmentAuditEvents.length,
      ...this.courseAssignmentAuditEvents.filter((event) => event.courseId !== courseId),
    );
    this.attendanceScopePolicies.delete(courseId);
  }

  upsertCourseMemberRole(
    courseId: string,
    userId: string,
    role: AdminCourseMemberRole,
  ): AdminCourseMemberBinding {
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

  deleteCourseMember(courseId: string, userId: string) {
    const targetCourse = this.courses.find((course) => course.courseId === courseId);

    if (!targetCourse) {
      throw new NotFoundException({
        code: "COURSE_NOT_FOUND",
        message: `courseId=${courseId} 수업을 찾을 수 없습니다.`,
      });
    }

    void targetCourse;
    this.memberBindings = this.memberBindings.filter(
      (binding) => !(binding.courseId === courseId && binding.userId === userId),
    );
  }

  getScheduleWorkspace(): AdminScheduleWorkspaceResponse {
    return {
      schedules: this.schedules
        .map((schedule) => ({ ...schedule }))
        .sort((a, b) => this.compareByDateAndTime(a, b)),
      scopes: this.buildScheduleScopes(),
    };
  }

  createSchedule(input: CreateAdminScheduleDto): AdminScheduleEvent {
    this.assertScheduleInput(input);

    const attendanceWindowLabel =
      input.requiresAttendanceCheck && input.attendanceWindowEndAt
        ? `${this.formatTimeLabel(input.attendanceWindowEndAt)}까지 인증 가능`
        : undefined;

    const created: AdminScheduleEvent = {
      id: `schedule-custom-${Date.now().toString(36)}`,
      title: input.title.trim(),
      categoryLabel: input.categoryLabel.trim() || "운영",
      dateKey: input.dateKey,
      dateLabel: this.buildDateLabel(input.dateKey),
      timeLabel: input.timeLabel.trim() || "시간 미정",
      locationLabel: input.locationLabel.trim() || "장소 미정",
      visibilityType: input.visibilityType,
      visibilityScope: input.visibilityScope,
      visibilityLabel: input.visibilityLabel.trim() || this.buildVisibilityLabel(input.visibilityScope),
      requiresAttendanceCheck: input.requiresAttendanceCheck,
      attendanceWindowStartAt: input.attendanceWindowStartAt,
      attendanceWindowEndAt: input.attendanceWindowEndAt,
      attendanceWindowLabel,
      sourceType: "CUSTOM",
    };

    this.schedules.push(created);
    return { ...created };
  }

  updateSchedule(scheduleId: string, input: UpdateAdminScheduleDto): AdminScheduleEvent {
    this.assertScheduleInput(input);

    const targetIndex = this.schedules.findIndex((schedule) => schedule.id === scheduleId);

    if (targetIndex < 0) {
      throw new NotFoundException({
        code: "SCHEDULE_NOT_FOUND",
        message: `scheduleId=${scheduleId} 일정을 찾을 수 없습니다.`,
      });
    }

    const previous = this.schedules[targetIndex];
    const attendanceWindowLabel =
      input.requiresAttendanceCheck && input.attendanceWindowEndAt
        ? `${this.formatTimeLabel(input.attendanceWindowEndAt)}까지 인증 가능`
        : undefined;

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
      visibilityLabel: input.visibilityLabel.trim() || this.buildVisibilityLabel(input.visibilityScope),
      requiresAttendanceCheck: input.requiresAttendanceCheck,
      attendanceWindowStartAt: input.attendanceWindowStartAt,
      attendanceWindowEndAt: input.attendanceWindowEndAt,
      attendanceWindowLabel,
      sourceType: previous.sourceType,
    };

    this.schedules[targetIndex] = updated;
    return { ...updated };
  }

  deleteSchedule(scheduleId: string) {
    const targetIndex = this.schedules.findIndex((schedule) => schedule.id === scheduleId);

    if (targetIndex < 0) {
      throw new NotFoundException({
        code: "SCHEDULE_NOT_FOUND",
        message: `scheduleId=${scheduleId} 일정을 찾을 수 없습니다.`,
      });
    }

    this.schedules.splice(targetIndex, 1);
  }

  getAttendanceScopeWorkspace(courseId: string): AdminAttendanceScopeWorkspaceResponse {
    const course = this.courses.find((item) => item.courseId === courseId);

    if (!course) {
      throw new NotFoundException({
        code: "COURSE_NOT_FOUND",
        message: `courseId=${courseId} 수업을 찾을 수 없습니다.`,
      });
    }

    const availableScopes = this.buildScheduleScopes();
    const requestedScopes = this.attendanceScopePolicies.get(courseId) ?? ["global", course.classScope];
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

  updateAttendanceScopes(courseId: string, requestedScopes: string[]) {
    const workspace = this.getAttendanceScopeWorkspace(courseId);
    const allowedScheduleScopes = this.normalizeAllowedScopes(
      requestedScopes,
      workspace.availableScopes,
      workspace.classScope,
    );

    this.attendanceScopePolicies.set(courseId, allowedScheduleScopes);

    return {
      ...workspace,
      allowedScheduleScopes,
    };
  }

  getCourseAssignmentAudit(courseId: string): AdminCourseAssignmentAuditEvent[] {
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

  recordCourseAssignmentAuditEvent(
    input: Omit<AdminCourseAssignmentAuditEvent, "id" | "occurredAt"> & {
      id?: string;
      occurredAt?: string;
    },
  ) {
    const exists = this.courses.some((course) => course.courseId === input.courseId);

    if (!exists) {
      return;
    }

    const next: AdminCourseAssignmentAuditEvent = {
      id: input.id ?? `audit-${Date.now().toString(36)}`,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      ...input,
    };

    this.courseAssignmentAuditEvents.unshift(next);
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

  private assertScheduleInput(input: CreateAdminScheduleDto | UpdateAdminScheduleDto) {
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

    if (
      input.visibilityType === "class" &&
      !this.courses.some((course) => course.classScope === visibilityScope)
    ) {
      throw new BadRequestException({
        code: "INVALID_SCHEDULE_SCOPE",
        message: `${visibilityScope} 는 등록된 class scope가 아닙니다.`,
      });
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

  private buildVisibilityLabel(scope: string) {
    if (scope === "global") {
      return "학원 전체 행사";
    }

    const course = this.courses.find((item) => item.classScope === scope);

    if (!course) {
      return scope;
    }

    return `${course.courseTitle} 수업`;
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
