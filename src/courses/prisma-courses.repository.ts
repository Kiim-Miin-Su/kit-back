import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CoursesRepository } from "./courses.repository";
import {
  CourseLifecycleStatus,
  CoursesDatabase,
  PublicEnrollmentStatus,
  StoredCourseRecord,
} from "./courses.types";

type PrismaCourseCurriculumPreviewRow = {
  previewId: string;
  title: string;
  durationLabel: string;
  isPreview: boolean;
  summary: string | null;
  headers: unknown;
};

type PrismaCourseWithRelations = {
  courseId: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  tags: unknown;
  level: string;
  durationLabel: string;
  lessonCount: number;
  priceLabel: string;
  rating: number;
  reviewCount: number;
  enrollmentCount: number;
  thumbnailTone: string;
  defaultEnrollmentStatus: string;
  enrollmentStatusLabel: string | null;
  isFeatured: boolean;
  learningPoints: unknown;
  classScope: string;
  status: string;
  sectionLabel: string;
  roomLabel: string;
  capacity: number;
  startDate: string;
  endDate: string;
  enrollmentStartDate: string;
  enrollmentEndDate: string;
  instructor: {
    name: string;
    title: string;
  };
  curriculumPreviews: PrismaCourseCurriculumPreviewRow[];
};

type PrismaInstructorLookupRow = {
  name: string;
  userId: string;
};

@Injectable()
export class PrismaCoursesRepository implements CoursesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async read(): Promise<CoursesDatabase> {
    const courses = await this.prisma.course.findMany({
      include: {
        instructor: true,
        curriculumPreviews: {
          orderBy: [{ sortOrder: "asc" }, { previewId: "asc" }],
        },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "asc" }, { courseId: "asc" }],
    });

    const mappedCourses: StoredCourseRecord[] = courses.map((course: PrismaCourseWithRelations) => ({
      id: course.courseId,
      slug: course.slug,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      category: course.category,
      tags: Array.isArray(course.tags) ? course.tags.map(String) : [],
      level: this.toCourseLevel(course.level),
      durationLabel: course.durationLabel,
      lessonCount: course.lessonCount,
      priceLabel: course.priceLabel,
      rating: course.rating,
      reviewCount: course.reviewCount,
      enrollmentCount: course.enrollmentCount,
      thumbnailTone: course.thumbnailTone,
      instructor: {
        name: course.instructor.name,
        title: course.instructor.title,
      },
      enrollmentStatus: this.toPublicEnrollmentStatus(course.defaultEnrollmentStatus),
      enrollmentStatusLabel: course.enrollmentStatusLabel ?? undefined,
      isFeatured: course.isFeatured,
      learningPoints: Array.isArray(course.learningPoints)
        ? course.learningPoints.map(String)
        : [],
      curriculumPreview: course.curriculumPreviews.map((item: PrismaCourseCurriculumPreviewRow) => ({
        id: item.previewId,
        title: item.title,
        durationLabel: item.durationLabel,
        isPreview: item.isPreview,
        summary: item.summary ?? undefined,
        headers: Array.isArray(item.headers) ? item.headers.map(String) : undefined,
      })),
      classScope: course.classScope,
      lifecycleStatus: this.toCourseLifecycleStatus(course.status),
      sectionLabel: course.sectionLabel,
      roomLabel: course.roomLabel,
      capacity: course.capacity,
      startDate: course.startDate,
      endDate: course.endDate,
      enrollmentStartDate: course.enrollmentStartDate,
      enrollmentEndDate: course.enrollmentEndDate,
    }));

    return {
      categories: [...new Set(mappedCourses.map((course) => course.category))],
      featuredCourseId:
        mappedCourses.find((course) => course.isFeatured)?.id ?? mappedCourses[0]?.id ?? "",
      courses: mappedCourses,
    };
  }

  async write(database: CoursesDatabase): Promise<void> {
    const instructorNames = [...new Set(database.courses.map((course) => course.instructor.name))];
    const instructors = await this.prisma.user.findMany({
      where: {
        name: {
          in: instructorNames,
        },
      },
      select: {
        userId: true,
        name: true,
      },
    });
    const instructorUserIdByName = new Map(
      instructors.map((instructor: PrismaInstructorLookupRow) => [
        instructor.name,
        instructor.userId,
      ]),
    );

    await this.prisma.$transaction(
      database.courses.flatMap((course) => [
        this.prisma.course.upsert({
          where: { courseId: course.id },
          create: {
            courseId: course.id,
            slug: course.slug,
            title: course.title,
            subtitle: course.subtitle,
            description: course.description,
            category: course.category,
            tags: course.tags,
            level: this.fromCourseLevel(course.level),
            durationLabel: course.durationLabel,
            lessonCount: course.lessonCount,
            priceLabel: course.priceLabel,
            rating: course.rating,
            reviewCount: course.reviewCount,
            enrollmentCount: course.enrollmentCount,
            thumbnailTone: course.thumbnailTone,
            instructorUserId:
              instructorUserIdByName.get(course.instructor.name) ?? "instructor-dev-01",
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
            isFeatured: course.isFeatured ?? false,
            learningPoints: course.learningPoints,
          },
          update: {
            slug: course.slug,
            title: course.title,
            subtitle: course.subtitle,
            description: course.description,
            category: course.category,
            tags: course.tags,
            level: this.fromCourseLevel(course.level),
            durationLabel: course.durationLabel,
            lessonCount: course.lessonCount,
            priceLabel: course.priceLabel,
            rating: course.rating,
            reviewCount: course.reviewCount,
            enrollmentCount: course.enrollmentCount,
            thumbnailTone: course.thumbnailTone,
            instructorUserId:
              instructorUserIdByName.get(course.instructor.name) ?? "instructor-dev-01",
            classScope: course.classScope,
            status: course.lifecycleStatus,
            sectionLabel: course.sectionLabel,
            roomLabel: course.roomLabel,
            capacity: course.capacity,
            startDate: course.startDate,
            endDate: course.endDate,
            enrollmentStartDate: course.enrollmentStartDate,
            enrollmentEndDate: course.enrollmentEndDate,
            defaultEnrollmentStatus: course.enrollmentStatus,
            enrollmentStatusLabel: course.enrollmentStatusLabel,
            isFeatured: course.isFeatured ?? false,
            learningPoints: course.learningPoints,
          },
        }),
        this.prisma.courseCurriculumPreview.deleteMany({
          where: { courseId: course.id },
        }),
        this.prisma.courseCurriculumPreview.createMany({
          data: course.curriculumPreview.map((preview, index) => ({
            previewId: preview.id,
            courseId: course.id,
            title: preview.title,
            durationLabel: preview.durationLabel,
            sortOrder: index,
            isPreview: preview.isPreview ?? false,
            summary: preview.summary,
            headers: preview.headers,
          })),
          skipDuplicates: true,
        }),
      ]),
    );
  }

  private toCourseLevel(level: string): "입문" | "중급" | "심화" {
    if (level === "BEGINNER") return "입문";
    if (level === "ADVANCED") return "심화";
    return "중급";
  }

  private fromCourseLevel(level: "입문" | "중급" | "심화") {
    if (level === "입문") return "BEGINNER";
    if (level === "심화") return "ADVANCED";
    return "INTERMEDIATE";
  }

  private toCourseLifecycleStatus(status: string): CourseLifecycleStatus {
    return status === "ACTIVE" ? "ACTIVE" : "PENDING";
  }

  private toPublicEnrollmentStatus(status: string): PublicEnrollmentStatus {
    if (status === "PENDING" || status === "ACTIVE" || status === "COMPLETED") {
      return status;
    }

    return "NOT_ENROLLED";
  }
}
