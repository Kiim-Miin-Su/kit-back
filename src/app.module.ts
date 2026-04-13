import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AttendanceModule } from "./attendance/attendance.module";
// TODO(P2): AI 피드백 자동화 — 구현 예정 스텁
import { AiModule } from "./ai/ai.module";
// TODO(P2): 학습 분석 대시보드 — 구현 예정 스텁
import { AnalyticsModule } from "./analytics/analytics.module";
import { AssignmentsModule } from "./assignments/assignments.module";
import { AuthModule } from "./auth/auth.module";
import { CoursesModule } from "./courses/courses.module";
// TODO(P2): 커리큘럼 영상 관리 — 구현 예정 스텁
import { CurriculumsModule } from "./curriculums/curriculums.module";
import { EnrollmentsModule } from "./enrollments/enrollments.module";
import { FilesModule } from "./files/files.module";
import { HealthModule } from "./health/health.module";
// TODO(P2): 푸시/이메일 알림 — 구현 예정 스텁
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
// TODO(P2): 학습 진도 추적 — 구현 예정 스텁
import { ProgressModule } from "./progress/progress.module";
// TODO(P2): 퀴즈/평가 — 구현 예정 스텁
import { QuizzesModule } from "./quizzes/quizzes.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    AttendanceModule,
    CurriculumsModule,
    EnrollmentsModule,
    FilesModule,
    HealthModule,
    ProgressModule,
    AssignmentsModule,
    QuizzesModule,
    AnalyticsModule,
    NotificationsModule,
    AiModule,
    AdminModule,
  ],
})
export class AppModule {}
