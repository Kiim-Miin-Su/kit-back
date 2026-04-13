import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from "@nestjs/common";
import { AdminService } from "../admin/admin.service";
import { CoursesService } from "../courses/courses.service";
import { EnrollmentsService } from "../enrollments/enrollments.service";
import { ATTENDANCE_REPOSITORY, AttendanceRepository } from "./attendance.repository";
import {
  AttendanceCheckInResponse,
  AttendanceDatabase,
  AttendanceRecord,
  StudentAttendanceWorkspaceResponse,
  StudentScheduleResponse,
} from "./attendance.types";

@Injectable()
export class AttendanceService {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly repository: AttendanceRepository,
    private readonly enrollmentsService: EnrollmentsService,
    private readonly coursesService: CoursesService,
    private readonly adminService: AdminService,
  ) {}

  async getWorkspace(userId: string): Promise<StudentAttendanceWorkspaceResponse> {
    const enrollment = await this.getPrimaryEnrollmentOrThrow(userId);
    const course = await this.coursesService.getStoredCourseById(enrollment.courseId);
    const database = await this.readDatabase();
    const visibleScopes = ["global", course.classScope];

    const templateSchedules = await Promise.all(
      database.scheduleTemplates.map((template) =>
        this.buildScheduleResponse({
          userId,
          classScope: course.classScope,
          className: course.title,
          templateKey: template.key,
        }),
      ),
    );

    const customSchedules: StudentScheduleResponse[] = this.adminService
      .getCustomSchedulesForScopes(visibleScopes)
      .map((schedule) => ({
        id: schedule.id,
        title: schedule.title,
        categoryLabel: schedule.categoryLabel,
        dateKey: schedule.dateKey,
        dateLabel: schedule.dateLabel,
        timeLabel: schedule.timeLabel,
        locationLabel: schedule.locationLabel,
        visibilityType: schedule.visibilityType,
        visibilityScope: schedule.visibilityScope,
        visibilityLabel: schedule.visibilityLabel,
        requiresAttendanceCheck: schedule.requiresAttendanceCheck,
        attendanceWindowLabel: schedule.attendanceWindowLabel,
        attendanceWindowStartAt: schedule.attendanceWindowStartAt,
        attendanceWindowEndAt: schedule.attendanceWindowEndAt,
        attendanceStatus: schedule.requiresAttendanceCheck ? "NOT_CHECKED_IN" : undefined,
        supportsCodeCheckIn: false,
      }));

    return {
      programName: database.programName,
      className: course.title,
      classScope: course.classScope,
      allowedScheduleScopes: visibleScopes,
      allowedScheduleLabels: ["학원 전체 행사", `${course.title} 수업`],
      expectedCodeLength: database.expectedCodeLength,
      schedules: [...templateSchedules, ...customSchedules],
    };
  }

  async checkIn(userId: string, scheduleId: string, code: string): Promise<AttendanceCheckInResponse> {
    const workspace = await this.getWorkspace(userId);
    const target = workspace.schedules.find((schedule) => schedule.id === scheduleId);

    if (!target) {
      throw new BadRequestException({
        code: "SCHEDULE_NOT_FOUND",
        message: "선택한 출석 일정을 찾을 수 없습니다.",
      });
    }

    if (!target.requiresAttendanceCheck) {
      throw new BadRequestException({
        code: "NOT_REQUIRED",
        message: "이 일정은 출석 인증 대상이 아닙니다.",
      });
    }

    if (!target.supportsCodeCheckIn) {
      throw new BadRequestException({
        code: "UNSUPPORTED",
        message: "이 일정은 코드 인증을 지원하지 않습니다.",
      });
    }

    if (target.attendanceStatus === "CHECKED_IN") {
      throw new ConflictException({
        code: "ALREADY_CHECKED_IN",
        message: "이미 출석이 완료된 일정입니다.",
      });
    }

    if (target.attendanceStatus === "ABSENT") {
      throw new ConflictException({
        code: "ALREADY_ABSENT",
        message: "결석 처리된 일정은 인증할 수 없습니다.",
      });
    }

    if (!this.canCheckInNow(target.attendanceWindowStartAt, target.attendanceWindowEndAt)) {
      throw new ConflictException({
        code: "OUTSIDE_ATTENDANCE_WINDOW",
        message: target.attendanceWindowLabel
          ? `${target.attendanceWindowLabel}에만 인증할 수 있습니다.`
          : "출석 인증 가능 시간이 아닙니다.",
      });
    }

    const database = await this.readDatabase();
    const normalizedCode = code.trim();

    if (normalizedCode.length !== database.expectedCodeLength) {
      throw new BadRequestException({
        code: "INVALID_CODE_LENGTH",
        message: `인증코드는 ${database.expectedCodeLength}자리여야 합니다.`,
      });
    }

    const scheduleKey = this.extractScheduleKey(scheduleId);
    const expectedCode = database.checkInCodeByScheduleKey[scheduleKey];

    if (!expectedCode || expectedCode !== normalizedCode) {
      throw new BadRequestException({
        code: "INVALID_CODE",
        message: "인증코드가 올바르지 않습니다.",
      });
    }

    const checkedAt = new Date().toISOString();
    const nextRecord: AttendanceRecord = {
      userId,
      scheduleKey,
      attendanceStatus: "CHECKED_IN",
      checkedAt,
    };

    database.records = database.records.filter(
      (record) => !(record.userId === userId && record.scheduleKey === scheduleKey),
    );
    database.records.push(nextRecord);
    await this.repository.write(database);

    return {
      scheduleId,
      attendanceStatus: "CHECKED_IN",
      checkedAt,
      isLate: false,
    };
  }

  private async getPrimaryEnrollmentOrThrow(userId: string) {
    const enrollment = await this.enrollmentsService.getPrimaryEnrollment(userId);

    if (!enrollment) {
      throw new BadRequestException({
        code: "ENROLLMENT_REQUIRED",
        message: "출석 워크스페이스를 열 수 있는 수강 정보가 없습니다.",
      });
    }

    return enrollment;
  }

  private async buildScheduleResponse({
    userId,
    classScope,
    className,
    templateKey,
  }: {
    userId: string;
    classScope: string;
    className: string;
    templateKey: string;
  }): Promise<StudentScheduleResponse> {
    const database = await this.readDatabase();
    const template = database.scheduleTemplates.find((item) => item.key === templateKey);

    if (!template) {
      throw new BadRequestException({
        code: "SCHEDULE_NOT_FOUND",
        message: `templateKey=${templateKey} 일정을 찾을 수 없습니다.`,
      });
    }

    const date = this.addDays(new Date(), template.dayOffset);
    const dateKey = this.formatDateKey(date);
    const scheduleId = `${template.key}::${classScope}`;
    const record = database.records.find(
      (item) => item.userId === userId && item.scheduleKey === template.key,
    );
    const visibilityScope = template.visibilityType === "global" ? "global" : classScope;
    const visibilityLabel =
      template.visibilityType === "global" ? "학원 전체 행사" : `${className} 수업`;
    const attendanceWindowStartAt = template.attendanceWindowStartTime
      ? this.toIsoDateTime(dateKey, template.attendanceWindowStartTime)
      : undefined;
    const attendanceWindowEndAt = template.attendanceWindowEndTime
      ? this.toIsoDateTime(dateKey, template.attendanceWindowEndTime)
      : undefined;

    return {
      id: scheduleId,
      title: template.title,
      categoryLabel: template.categoryLabel,
      dateKey,
      dateLabel: this.buildDateLabel(date),
      timeLabel: template.timeLabel,
      locationLabel: template.locationLabel,
      visibilityType: template.visibilityType,
      visibilityScope,
      visibilityLabel,
      requiresAttendanceCheck: template.requiresAttendanceCheck,
      attendanceWindowLabel: attendanceWindowEndAt
        ? `${template.attendanceWindowEndTime}까지 인증 가능`
        : undefined,
      attendanceWindowStartAt,
      attendanceWindowEndAt,
      attendanceStatus: record?.attendanceStatus ?? "NOT_CHECKED_IN",
      checkedAt: record?.checkedAt,
      supportsCodeCheckIn: template.supportsCodeCheckIn,
    };
  }

  private readDatabase(): Promise<AttendanceDatabase> {
    return this.repository.read();
  }

  private extractScheduleKey(scheduleId: string) {
    const [scheduleKey] = scheduleId.split("::");
    return scheduleKey;
  }

  private canCheckInNow(startAt?: string, endAt?: string) {
    if (!startAt || !endAt) {
      return false;
    }

    const now = Date.now();
    return now >= new Date(startAt).getTime() && now <= new Date(endAt).getTime();
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(date.getDate() + days);
    return next;
  }

  private formatDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private toIsoDateTime(dateKey: string, time: string) {
    return `${dateKey}T${time}:00+09:00`;
  }

  private buildDateLabel(date: Date) {
    const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(date);
    return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}`;
  }
}
