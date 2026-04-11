import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module";
import { AttendanceModule } from "./attendance/attendance.module";
import { AiModule } from "./ai/ai.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AssignmentsModule } from "./assignments/assignments.module";
import { AuthModule } from "./auth/auth.module";
import { CoursesModule } from "./courses/courses.module";
import { CurriculumsModule } from "./curriculums/curriculums.module";
import { EnrollmentsModule } from "./enrollments/enrollments.module";
import { FilesModule } from "./files/files.module";
import { HealthModule } from "./health/health.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { ProgressModule } from "./progress/progress.module";
import { QuizzesModule } from "./quizzes/quizzes.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
