# Progress 02 — 백엔드 구현 계획서 (2026-04-12)

## 목적
- 빈 스텁 모듈 8개를 인메모리 기반으로 구현하여 프론트엔드 fallback 없이 실연동 가능하게 한다.
- 기존 패턴(`interface → in-memory repository → service → controller → DTO`)을 따른다.
- 추후 Prisma/PostgreSQL 전환 시 Repository 구현체만 교체하면 되도록 설계한다.

## 현재 완료 상태 (progress_01 기준)
- admin 모듈: 사용자/수업/멤버/일정/출석scope/감사로그 — 완료
- assignments 모듈: 학생/강사 과제/제출/리뷰/피드백/타임라인 — 완료
- files 모듈: presign/complete/조회 + attachments 연결 — 완료
- health 모듈: `GET /healthz` — 완료
- 인프라: Docker, 통합테스트 4개, front-aligned mock-data — 완료

## 코드 대조 메모 (2026-04-12)
- `Auth + Users -> Courses + Enrollments -> Attendance` 로컬 구현은 완료됐다.
- 현재 저장소는 모두 in-memory 기반이라 로컬 실행과 테스트가 가능하다.
- 다음 우선순위는 `Files 보강 -> Guard 확장 -> Prisma 전환`이다.

---

## Phase 1 (P0): Auth + Users

> 모든 모듈의 기반. 인증 없이는 다른 API에 사용자 컨텍스트를 넘길 수 없다.

### 1-1. 패키지 설치

```
npm install @nestjs/jwt
```

### 1-2. mock-data 확장

**파일**: `src/mock-data/front-aligned.mock.ts`

기존 `adminSeedData.users` 배열의 각 사용자에 `email`, `password` 필드를 추가한다.
별도 export 함수 `createFrontAlignedUserCredentials()` 추가.

```ts
interface UserCredential {
  userId: string;
  email: string;
  password: string; // 개발용 평문, 추후 bcrypt 전환
}
```

이메일 규칙: `{userId}@koreait.academy` (예: `student-kim-hana@koreait.academy`)
기본 비밀번호: `password123`

### 1-3. Auth 모듈

**생성/수정 파일**:
- `src/auth/auth.module.ts` (기존 빈 스텁 → 구현)
- `src/auth/auth.service.ts` (신규)
- `src/auth/auth.controller.ts` (신규)
- `src/auth/auth.guard.ts` (신규)
- `src/auth/roles.guard.ts` (신규)
- `src/auth/roles.decorator.ts` (신규)
- `src/auth/auth.types.ts` (신규)
- `src/auth/dto/sign-in.dto.ts` (신규)

**엔드포인트**:

| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/auth/sign-in` | 로그인 | 불필요 |
| POST | `/auth/sign-out` | 로그아웃 | 필요 |
| GET | `/auth/me` | 현재 사용자 조회 | 필요 |
| POST | `/auth/refresh` | 토큰 갱신 | 불필요 (refresh token) |

**요청/응답 스키마**:

```ts
// POST /auth/sign-in
// Request
{ email: string; password: string }
// Response (프론트 AuthSession 타입 준수)
{ accessToken: string; user: { id: string; name: string; email: string; role: string } }

// GET /auth/me
// Response (프론트 AuthUser 타입 준수)
{ id: string; name: string; email: string; role: string }

// POST /auth/refresh
// Response
{ accessToken: string }
```

**검증 규칙**:
- email: `@IsEmail()`, 필수
- password: `@IsString()`, `@MinLength(4)`, 필수
- 이메일 미존재 → `{ code: "USER_NOT_FOUND" }` (401)
- 비밀번호 불일치 → `{ code: "INVALID_PASSWORD" }` (401)

**JWT 설정**:
- secret: `process.env.JWT_SECRET ?? "dev-jwt-secret-do-not-use-in-production"`
- accessToken 만료: 1h
- refreshToken 만료: 7d (인메모리 Map 저장)

**AuthGuard 동작**:
- `Authorization: Bearer <token>` 헤더에서 JWT 추출
- 유효하면 `request.user`에 `{ userId, email, role }` 주입
- 유효하지 않으면 401

**RolesGuard + @Roles() 데코레이터**:
- `@Roles('admin', 'instructor')` 식으로 컨트롤러/핸들러에 선언
- `request.user.role`이 허용 목록에 없으면 403

**프론트 연동 지점**: `front/src/services/auth.ts`, `front/src/store/auth-store.ts`

### 1-4. Users 모듈

**생성/수정 파일**:
- `src/users/users.module.ts` (기존 빈 스텁 → 구현)
- `src/users/users.service.ts` (신규)
- `src/users/users.controller.ts` (신규)
- `src/users/users.repository.ts` (신규 — 인터페이스)
- `src/users/in-memory-users.repository.ts` (신규)
- `src/users/users.types.ts` (신규)
- `src/users/dto/create-user.dto.ts` (신규)
- `src/users/dto/update-user.dto.ts` (신규)

**엔드포인트**:

| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/users/register` | 회원가입 | 불필요 |
| GET | `/users/me` | 내 프로필 | 필요 |
| PATCH | `/users/me` | 프로필 수정 | 필요 |

**요청/응답 스키마**:

```ts
// POST /users/register
// Request
{
  email: string;      // @IsEmail()
  password: string;   // @MinLength(6)
  userName: string;    // @IsString(), @MinLength(1)
  birthDate?: string;  // YYYY-MM-DD
}
// Response
{ userId: string; email: string; userName: string; role: string }

// GET /users/me
// Response
{ userId: string; email: string; userName: string; birthDate?: string; role: string; title: string }

// PATCH /users/me
// Request (전부 optional)
{ userName?: string; birthDate?: string; title?: string }
```

**Users ↔ Admin 관계**:
- `UsersService`가 사용자 데이터의 단일 진실 소스가 된다.
- `AdminService`는 `UsersService`를 주입받아 사용자 조회한다.
- `AuthService`도 `UsersService`를 주입받아 로그인 검증한다.

**의존 관계**: Auth → Users (UsersModule을 exports해서 AuthModule이 import)

---

## Phase 2 (P1): 핵심 도메인 API

> 프론트엔드 서비스 계층이 fallback mock 없이 동작하기 위한 핵심 API.

### 2-1. Courses 공개 API

**생성/수정 파일**:
- `src/courses/courses.module.ts` (현재 audit 컨트롤러만 연결됨 → courses 컨트롤러 추가)
- `src/courses/courses.service.ts` (신규)
- `src/courses/courses.controller.ts` (신규)
- `src/courses/courses.types.ts` (신규)

**엔드포인트**:

| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/courses` | 수업 카탈로그 (검색/필터 포함) | 불필요 |
| GET | `/courses/:slug` | 수업 상세 | 불필요 |
| GET | `/me/courses` | 내 수강 수업 목록 | 필요 |

**요청/응답 스키마**:

```ts
// GET /courses
// Query: page, size, sort, keyword, category, durationRange, priceRange, freeOnly, discountOnly, roadmapOnly
// Response (CourseCatalog 형태 또는 CourseSearchResult)
{
  featuredCourse: CourseDetail;
  courses: CourseDetail[];
  categories: string[];
}

// GET /courses/:slug
// Response: CourseDetail
{
  id: string; slug: string; title: string; subtitle: string; description: string;
  category: string; tags: string[]; level: string; durationLabel: string;
  lessonCount: number; priceLabel: string; rating: number; reviewCount: number;
  enrollmentCount: number; thumbnailTone: string;
  instructor: { name: string; title: string };
  enrollmentStatus: "NOT_ENROLLED" | "PENDING" | "ACTIVE" | "COMPLETED";
  learningPoints: string[];
  curriculumPreview: { id: string; title: string; durationLabel: string; isPreview?: boolean; summary?: string; headers?: string[] }[];
}

// GET /me/courses
// Response: CourseDetail[] (enrollmentStatus가 ACTIVE 또는 PENDING인 것)
```

**seed 데이터**: `front/src/features/course/mock-course-data.ts`의 `mockCourseCatalog`를 백엔드 seed로 변환.
이 seed를 `src/mock-data/front-aligned.mock.ts`에 `createFrontAlignedCourseCatalog()` 함수로 추가.

**프론트 연동 지점**: `front/src/services/course.ts`

### 2-2. Enrollments 모듈

**생성/수정 파일**:
- `src/enrollments/enrollments.module.ts` (기존 빈 스텁 → 구현)
- `src/enrollments/enrollments.service.ts` (신규)
- `src/enrollments/enrollments.controller.ts` (신규)
- `src/enrollments/enrollments.repository.ts` (신규 — 인터페이스)
- `src/enrollments/in-memory-enrollments.repository.ts` (신규)
- `src/enrollments/enrollments.types.ts` (신규)
- `src/enrollments/dto/create-enrollment.dto.ts` (신규)

**엔드포인트**:

| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/enrollments` | 수강 신청 | 필요 |
| GET | `/me/enrollments` | 내 수강 목록 | 필요 |
| PATCH | `/enrollments/:enrollmentId` | 수강 상태 변경 | 필요 |
| DELETE | `/enrollments/:enrollmentId` | 수강 취소 | 필요 |

**요청/응답 스키마**:

```ts
// POST /enrollments
// Request
{ courseId: string }
// Response
{ enrollmentId: string; courseId: string; userId: string; status: "PENDING" | "ACTIVE"; enrolledAt: string }

// GET /me/enrollments
// Response
{ enrollments: { enrollmentId: string; courseId: string; userId: string; status: string; enrolledAt: string }[] }
```

**검증 규칙**:
- 이미 수강 중이면 → `ALREADY_ENROLLED` (409)
- 수업 미존재 → `COURSE_NOT_FOUND` (404)
- 수업 상태가 PENDING이 아니고 모집 기간이 아니면 → `ENROLLMENT_CLOSED` (400)

**seed 데이터**: `adminSeedData.memberBindings`에서 STUDENT 바인딩을 enrollment 초기 데이터로 변환.

**의존 관계**: Enrollments → Courses (수업 존재 확인), Enrollments → Users (사용자 확인)

**프론트 연동 지점**: 수업 상세 페이지 CTA, `front/src/services/course.ts`의 `fetchMyLearningCourses`

### 2-3. Attendance 학생 API

**생성/수정 파일**:
- `src/attendance/attendance.module.ts` (신규 디렉토리)
- `src/attendance/attendance.service.ts` (신규)
- `src/attendance/attendance.controller.ts` (신규)
- `src/attendance/attendance.types.ts` (신규)
- `src/attendance/dto/check-in.dto.ts` (신규)
- `src/app.module.ts` (AttendanceModule import 추가)

**엔드포인트**:

| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/me/attendance/workspace` | 학생 출석 워크스페이스 | 필요 |
| POST | `/attendance/check-in` | 출석 코드 인증 | 필요 |

**선행 조건**:
- AuthGuard에서 `request.user`를 사용할 수 있어야 한다.
- Enrollments/Courses 기준으로 현재 사용자의 수강 컨텍스트를 확인할 수 있어야 한다.

**요청/응답 스키마**:

```ts
// GET /me/attendance/workspace
// Response (프론트 StudentAttendanceProfile 타입 준수)
{
  programName: string;
  className: string;
  classScope: string;
  allowedScheduleScopes: string[];
  allowedScheduleLabels: string[];
  expectedCodeLength: number;   // 6
  schedules: StudentScheduleEvent[];
}

// StudentScheduleEvent 구조:
{
  id: string; title: string; categoryLabel: string;
  dateKey: string; dateLabel: string; timeLabel: string; locationLabel: string;
  visibilityType: "global" | "class"; visibilityScope: string; visibilityLabel: string;
  requiresAttendanceCheck: boolean;
  attendanceWindowLabel?: string;
  attendanceWindowStartAt?: string;
  attendanceWindowEndAt?: string;
  attendanceStatus?: "NOT_CHECKED_IN" | "CHECKED_IN" | "LATE" | "ABSENT";
  checkedAt?: string;
  supportsCodeCheckIn?: boolean;
}

// POST /attendance/check-in
// Request
{ scheduleId: string; code: string }
// Response (프론트 AttendanceCheckInResult 타입 준수)
{ scheduleId: string; attendanceStatus: string; checkedAt: string; isLate: boolean }
```

**검증 규칙**:
- 일정 미존재 → `SCHEDULE_NOT_FOUND`
- 출석 대상 아님 → `NOT_REQUIRED`
- 코드 인증 미지원 → `UNSUPPORTED`
- 이미 출석 → `ALREADY_CHECKED_IN`
- 결석 처리됨 → `ALREADY_ABSENT`
- 인증 시간 밖 → `OUTSIDE_ATTENDANCE_WINDOW`
- 코드 길이 불일치 → `INVALID_CODE_LENGTH`
- 코드 불일치 → `INVALID_CODE`

**인메모리 출석 코드 저장소**:
- 일정별 인증 코드: `Map<scheduleId, code>` (seed: `"attendance-morning-1" → "381924"` 등)
- 출석 기록: `Map<userId+scheduleId, { status, checkedAt }>` 

**seed 데이터**: `front/src/features/attendance/mock-attendance-data.ts`의 `studentAttendanceProfile`을 백엔드 seed로 사용.

**의존 관계**: Attendance → Admin (일정 데이터 참조), Attendance → Users/Enrollments (수강생 확인)

**프론트 연동 지점**: `front/src/services/attendance.ts`의 `fetchStudentAttendanceWorkspace`, `submitStudentAttendanceCheckIn`

### 2-4. Calendar API

**생성/수정 파일**:
- `src/calendar/calendar.module.ts` (신규 디렉토리)
- `src/calendar/calendar.service.ts` (신규)
- `src/calendar/calendar.controller.ts` (신규)
- `src/calendar/calendar.types.ts` (신규)
- `src/calendar/dto/create-holiday.dto.ts` (신규)
- `src/app.module.ts` (CalendarModule import 추가)

**엔드포인트**:

| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/calendar/holidays` | 공휴일 조회 | 불필요 |
| POST | `/admin/calendar/holidays` | 커스텀 휴일 추가 | 필요 (admin) |
| DELETE | `/admin/calendar/holidays/:holidayId` | 커스텀 휴일 삭제 | 필요 (admin) |

**요청/응답 스키마**:

```ts
// GET /calendar/holidays?country=KR&year=2026&month=4
// Response
{ holidays: { id: string; dateKey: string; name: string; sourceType: "NATIONAL" | "CUSTOM" }[] }

// POST /admin/calendar/holidays
// Request
{ dateKey: string; name: string; sourceType: "CUSTOM" }
// Response
{ id: string; dateKey: string; name: string; sourceType: "CUSTOM" }
```

**seed 데이터**: 한국 공휴일 2026년 하드코딩 (신정, 설날, 삼일절, 어린이날 등).

**프론트 연동 지점**: `front/src/services/attendance.ts`의 `fetchCalendarHolidays`, `createCustomHoliday`, `deleteCustomHoliday`

---

## Phase 3 (P1): 학습 콘텐츠

> 커리큘럼과 학습 진도. 프론트 learn 페이지와 연동.

### 3-1. Curriculums 모듈

**생성/수정 파일**:
- `src/curriculums/curriculums.module.ts` (기존 빈 스텁 → 구현)
- `src/curriculums/curriculums.service.ts` (신규)
- `src/curriculums/curriculums.controller.ts` (신규)
- `src/curriculums/curriculums.types.ts` (신규)

**엔드포인트**:

| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/courses/:courseId/curriculum` | 수업 커리큘럼 조회 | 불필요 |
| POST | `/instructor/courses/:courseId/sections` | 섹션 추가 | 필요 (instructor) |
| POST | `/instructor/courses/:courseId/sections/:sectionId/lessons` | 레슨 추가 | 필요 (instructor) |

**요청/응답 스키마**:

```ts
// GET /courses/:courseId/curriculum
// Response
{
  courseId: string;
  sections: {
    id: string; title: string; order: number;
    lessons: {
      id: string; title: string; durationLabel: string; order: number;
      type: "VIDEO" | "TEXT" | "QUIZ";
      isPreview?: boolean; summary?: string; headers?: string[];
    }[];
  }[];
}
```

**seed 데이터**: `mockCourseCatalog.courses[*].curriculumPreview`를 section/lesson 구조로 변환.

**프론트 연동 지점**: 수업 상세 페이지의 `curriculumPreview`, learn 페이지의 `curriculum-grid.tsx`

### 3-2. Progress 모듈

**생성/수정 파일**:
- `src/progress/progress.module.ts` (기존 빈 스텁 → 구현)
- `src/progress/progress.service.ts` (신규)
- `src/progress/progress.controller.ts` (신규)
- `src/progress/progress.types.ts` (신규)

**엔드포인트**:

| 메서드 | 경로 | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/me/progress` | 내 학습 진도 현황 | 필요 |
| GET | `/me/progress/:courseId` | 특정 수업 진도 | 필요 |
| PATCH | `/lessons/:lessonId/progress` | 진도 갱신 (영상 시청 등) | 필요 |

**요청/응답 스키마**:

```ts
// GET /me/progress
// Response
{
  courses: {
    courseId: string; courseTitle: string;
    completedLessonCount: number; totalLessonCount: number;
    progressPercent: number; lastAccessedAt?: string;
  }[];
}

// PATCH /lessons/:lessonId/progress
// Request
{ completedPercent: number; lastPosition?: number }
// Response
{ lessonId: string; completedPercent: number; lastPosition?: number; updatedAt: string }
```

**seed 데이터**: demo 사용자의 수강 중 수업에 대해 임의 진도 데이터 생성.

**프론트 연동 지점**: `front/src/features/learn/learning-metrics.tsx`, `front/src/features/learn/player-stage.tsx`

---

## 모듈 의존 관계

```
UsersModule (사용자 데이터 단일 소스)
  ├── AuthModule (JWT 인증)
  ├── AdminModule (사용자 검색 — 기존)
  ├── EnrollmentsModule (수강생 확인)
  └── AttendanceModule (출석 대상 확인)

CoursesModule (수업 카탈로그)
  ├── EnrollmentsModule (수강 상태 연결)
  ├── CurriculumsModule (커리큘럼 연결)
  └── ProgressModule (진도 연결)

AdminModule (일정/수업 관리 — 기존)
  └── AttendanceModule (일정 데이터 참조)
```

## 파일 생성 총 목록

| Phase | 디렉토리 | 신규 파일 수 | 수정 파일 수 |
| --- | --- | --- | --- |
| 1 | `src/auth/` | 7 | 1 (module) |
| 1 | `src/users/` | 7 | 1 (module) |
| 1 | `src/mock-data/` | 0 | 1 (front-aligned.mock.ts) |
| 2 | `src/courses/` | 3 | 1 (module) |
| 2 | `src/enrollments/` | 6 | 1 (module) |
| 2 | `src/attendance/` | 5 | 0 (신규 디렉토리) |
| 2 | `src/calendar/` | 5 | 0 (신규 디렉토리) |
| 3 | `src/curriculums/` | 3 | 1 (module) |
| 3 | `src/progress/` | 3 | 1 (module) |
| — | `src/` | 0 | 1 (app.module.ts) |
| **합계** | | **39** | **8** |

## 구현 순서 (의존성 기준)

1. mock-data 확장 (email/password/course-catalog seed)
2. Users 모듈 (공유 사용자 저장소)
3. Auth 모듈 (JWT + Guard) — Users에 의존
4. Courses 공개 API — seed 데이터 기반
5. Enrollments — Users + Courses에 의존
6. Attendance — Admin(일정) + Users에 의존
7. Calendar — 독립
8. Curriculums — Courses에 의존
9. Progress — Enrollments + Curriculums에 의존
10. app.module.ts 최종 정리 + 빌드 검증

## 보류 항목 (이번 계획 범위 밖)
- Quizzes, Notifications, Analytics, AI 모듈 → P2, 추후 계획
- Prisma DB 전환 → `data_structure.md` 참조, 인메모리 구현 안정화 후 진행
- 파일 업로드 owner 검증 → Phase 1 Auth 완료 후 별도 작업
- 강의 영상 업로드/스트리밍 API → P1이지만 인프라 의존성이 높아 별도 계획

## 참고 문서
- 이전 진행: `progress/progress_01.md`
- DB 전환 계획: `../data_structure.md`
- 프론트 핸드오프: `progress/FRONT_HANDOFF_2026-04-09.md`
- 프론트 타입 계약: `../front/src/types/auth.ts`, `../front/src/types/course.ts`, `../front/src/types/attendance.ts`
- 프론트 서비스 계약: `../front/src/services/auth.ts`, `../front/src/services/course.ts`, `../front/src/services/attendance.ts`
