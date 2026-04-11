import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CoursesService } from "../courses/courses.service";
import { PublicEnrollmentStatus } from "../courses/courses.types";
import { UsersService } from "../users/users.service";
import { CreateEnrollmentDto } from "./dto/create-enrollment.dto";
import { UpdateEnrollmentDto } from "./dto/update-enrollment.dto";
import { ENROLLMENTS_REPOSITORY, EnrollmentsRepository } from "./enrollments.repository";
import {
  EnrollmentResponse,
  EnrollmentsDatabase,
  EnrollmentStatus,
  StoredEnrollmentRecord,
} from "./enrollments.types";

@Injectable()
export class EnrollmentsService {
  constructor(
    @Inject(ENROLLMENTS_REPOSITORY)
    private readonly repository: EnrollmentsRepository,
    private readonly coursesService: CoursesService,
    private readonly usersService: UsersService,
  ) {}

  async createEnrollment(userId: string, input: CreateEnrollmentDto): Promise<EnrollmentResponse> {
    await this.assertUserExists(userId);

    const database = await this.readDatabase();
    const course = await this.coursesService.getStoredCourseById(input.courseId);
    const existing = database.enrollments.find(
      (item) => item.userId === userId && item.courseId === input.courseId,
    );

    if (existing) {
      throw new ConflictException({
        code: "ALREADY_ENROLLED",
        message: `userId=${userId} 는 이미 courseId=${input.courseId} 수강 상태입니다.`,
      });
    }

    const today = this.todayDateKey();

    if (today < course.enrollmentStartDate || today > course.enrollmentEndDate) {
      throw new BadRequestException({
        code: "ENROLLMENT_CLOSED",
        message: "현재 모집 기간이 아니어서 수강 신청할 수 없습니다.",
      });
    }

    const now = new Date().toISOString();
    const created: StoredEnrollmentRecord = {
      enrollmentId: `enrollment-${Date.now().toString(36)}`,
      courseId: course.id,
      userId,
      status: course.startDate > today ? "PENDING" : "ACTIVE",
      enrolledAt: now,
      updatedAt: now,
    };

    database.enrollments.push(created);
    await this.repository.write(database);
    return this.toEnrollmentResponse(created);
  }

  async listMyEnrollments(userId: string) {
    await this.assertUserExists(userId);
    return {
      enrollments: (await this.readDatabase()).enrollments
        .filter((item) => item.userId === userId)
        .map((item) => this.toEnrollmentResponse(item)),
    };
  }

  async listMyCourses(userId: string) {
    await this.assertUserExists(userId);

    return Promise.all(
      (await this.readDatabase()).enrollments
      .filter((item) => item.userId === userId)
      .map((enrollment) =>
        this.coursesService.getCourseById(
          enrollment.courseId,
          this.toPublicEnrollmentStatus(enrollment.status),
        ),
      ),
    );
  }

  async updateEnrollment(
    userId: string,
    enrollmentId: string,
    input: UpdateEnrollmentDto,
  ) {
    await this.assertUserExists(userId);

    const database = await this.readDatabase();
    const targetIndex = database.enrollments.findIndex(
      (item) => item.enrollmentId === enrollmentId,
    );

    if (targetIndex < 0) {
      throw new NotFoundException({
        code: "ENROLLMENT_NOT_FOUND",
        message: `enrollmentId=${enrollmentId} 수강 기록을 찾을 수 없습니다.`,
      });
    }

    const target = database.enrollments[targetIndex];

    if (target.userId !== userId) {
      throw new ForbiddenException({
        code: "ENROLLMENT_FORBIDDEN",
        message: "본인 수강 기록만 변경할 수 있습니다.",
      });
    }

    const updated: StoredEnrollmentRecord = {
      ...target,
      status: input.status,
      updatedAt: new Date().toISOString(),
      completedAt: input.status === "COMPLETED" ? new Date().toISOString() : undefined,
    };

    database.enrollments[targetIndex] = updated;
    await this.repository.write(database);
    return this.toEnrollmentResponse(updated);
  }

  async deleteEnrollment(userId: string, enrollmentId: string) {
    await this.assertUserExists(userId);

    const database = await this.readDatabase();
    const target = database.enrollments.find((item) => item.enrollmentId === enrollmentId);

    if (!target) {
      throw new NotFoundException({
        code: "ENROLLMENT_NOT_FOUND",
        message: `enrollmentId=${enrollmentId} 수강 기록을 찾을 수 없습니다.`,
      });
    }

    if (target.userId !== userId) {
      throw new ForbiddenException({
        code: "ENROLLMENT_FORBIDDEN",
        message: "본인 수강 기록만 취소할 수 있습니다.",
      });
    }

    database.enrollments = database.enrollments.filter((item) => item.enrollmentId !== enrollmentId);
    await this.repository.write(database);
    return {
      success: true,
    };
  }

  async getPrimaryEnrollment(userId: string) {
    return (await this.readDatabase()).enrollments.find(
      (item) => item.userId === userId && (item.status === "ACTIVE" || item.status === "PENDING"),
    );
  }

  private async assertUserExists(userId: string) {
    await this.usersService.getMyProfile(userId);
  }

  private readDatabase(): Promise<EnrollmentsDatabase> {
    return this.repository.read();
  }

  private toEnrollmentResponse(record: StoredEnrollmentRecord): EnrollmentResponse {
    return {
      enrollmentId: record.enrollmentId,
      courseId: record.courseId,
      userId: record.userId,
      status: record.status,
      enrolledAt: record.enrolledAt,
    };
  }

  private toPublicEnrollmentStatus(status: EnrollmentStatus): PublicEnrollmentStatus {
    if (status === "PENDING") {
      return "PENDING";
    }

    if (status === "COMPLETED") {
      return "COMPLETED";
    }

    return "ACTIVE";
  }

  private todayDateKey() {
    return new Date().toISOString().slice(0, 10);
  }
}
