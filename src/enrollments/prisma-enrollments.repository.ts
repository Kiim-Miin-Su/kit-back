import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EnrollmentsRepository } from "./enrollments.repository";
import { EnrollmentStatus, EnrollmentsDatabase } from "./enrollments.types";

type PrismaEnrollmentRow = {
  enrollmentId: string;
  courseId: string;
  userId: string;
  status: string;
  enrolledAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

@Injectable()
export class PrismaEnrollmentsRepository implements EnrollmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async read(): Promise<EnrollmentsDatabase> {
    const enrollments = await this.prisma.enrollment.findMany({
      orderBy: [{ enrolledAt: "asc" }, { enrollmentId: "asc" }],
    });

    return {
      enrollments: enrollments.map((enrollment: PrismaEnrollmentRow) => ({
        enrollmentId: enrollment.enrollmentId,
        courseId: enrollment.courseId,
        userId: enrollment.userId,
        status: this.toEnrollmentStatus(enrollment.status),
        enrolledAt: enrollment.enrolledAt.toISOString(),
        updatedAt: enrollment.updatedAt.toISOString(),
        completedAt: enrollment.completedAt?.toISOString(),
      })),
    };
  }

  async write(database: EnrollmentsDatabase): Promise<void> {
    const snapshotIds = database.enrollments.map((item) => item.enrollmentId);

    await this.prisma.$transaction([
      this.prisma.enrollment.deleteMany({
        where: snapshotIds.length > 0 ? { enrollmentId: { notIn: snapshotIds } } : {},
      }),
      ...database.enrollments.map((enrollment) =>
        this.prisma.enrollment.upsert({
          where: { enrollmentId: enrollment.enrollmentId },
          create: {
            enrollmentId: enrollment.enrollmentId,
            courseId: enrollment.courseId,
            userId: enrollment.userId,
            status: enrollment.status,
            enrolledAt: new Date(enrollment.enrolledAt),
            updatedAt: new Date(enrollment.updatedAt),
            completedAt: enrollment.completedAt ? new Date(enrollment.completedAt) : undefined,
          },
          update: {
            courseId: enrollment.courseId,
            userId: enrollment.userId,
            status: enrollment.status,
            enrolledAt: new Date(enrollment.enrolledAt),
            updatedAt: new Date(enrollment.updatedAt),
            completedAt: enrollment.completedAt ? new Date(enrollment.completedAt) : null,
          },
        }),
      ),
    ]);
  }

  private toEnrollmentStatus(status: string): EnrollmentStatus {
    if (status === "ACTIVE" || status === "COMPLETED") {
      return status;
    }

    return "PENDING";
  }
}
