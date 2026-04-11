# Backend Architecture Info (2026-04-12 updated)

## 1. 목적
- 프론트 최신 구현과 백엔드 API/검증/도메인 규칙을 맞추기 위한 기준 문서.
- 다음 개발자가 바로 구현을 이어갈 수 있도록 현재 구현 골격 + 후속 우선순위를 함께 기록한다.

---

## 2. 현재 구현 상태 (2026-04-12)

### 엔트리 (`src/main.ts`)
- 전역 `ValidationPipe` 적용 (`transform`, `whitelist`, `forbidNonWhitelisted`)
- **Swagger UI** `/api-docs` 자동 생성 (`@nestjs/swagger`, Bearer 인증 포함)

### 모듈 (`src/app.module.ts`)
- 완성 모듈: `AuthModule`, `UsersModule`, `CoursesModule`, `EnrollmentsModule`, `AttendanceModule`, `AssignmentsModule`, `FilesModule`, `AdminModule`, `HealthModule`
- 스텁 모듈 (TODO(P2)): `AiModule`, `AnalyticsModule`, `CurriculumsModule`, `NotificationsModule`, `ProgressModule`, `QuizzesModule`
- `PrismaModule` (Global) — 모든 모듈에서 `PrismaService` 사용 가능

### 인증 (`src/auth`)
- HMAC 서명 access token (1h TTL)
- httpOnly refresh token 쿠키 (7d TTL)
- **non-httpOnly `ai_edu_role` 쿠키** — 프론트 middleware.ts가 역할 기반 라우팅에 사용
- `AuthGuard`, `RolesGuard`, `@CurrentUser()` 데코레이터
- 세션 관리: `InMemoryAuthSessionRepository` / `PrismaAuthSessionRepository`

### 관리자 도메인 (`src/admin`)
- **모든 엔드포인트에 `AuthGuard` + `RolesGuard("admin")` 적용**
- **AdminService Prisma 전환 완료** — `DATA_SOURCE=prisma` 시 Course, Schedule, CourseMember, AttendanceScopePolicy, CourseAssignmentAuditEvent 모두 Prisma 사용
- `DATA_SOURCE=memory` 시 seed 데이터 기반 in-memory 동작 (기존 테스트 유지)

### 과제/파일 (`src/assignments`, `src/files`)
- **모든 엔드포인트에 `AuthGuard`/`RolesGuard` 적용 완료**
- DTO에서 `studentId`, `actorId`, `reviewerId`, `ownerId` 필드 제거 — `@CurrentUser()` 데코레이터로 주입
- `resolveActorRole`: userId 문자열 패턴 매칭 → `user.role.toUpperCase()` 직접 사용으로 개선
- `FilesService`: `@aws-sdk/s3-request-presigner` 통합 (S3_BUCKET 미설정 시 Mock fallback)

### 출석 (`src/attendance`)
- 지각(LATE) 판정 구현: 체크인 시각 > `attendanceWindowStartAt + 10분` → `LATE`
- Prisma 전환 완료

### 데이터소스 전환
- `src/common/data-source.ts`: `DATA_SOURCE=memory|prisma` 스위치
- Prisma 전환 완료: `auth`, `users`, `courses`, `enrollments`, `attendance`, **`admin`**
- 미전환: `assignments`, `files` (in-memory 저장소 유지)

---

## 3. 엔드포인트 목록

> 전체 상세 문서: **`http://localhost:4000/api-docs`** (Swagger UI)

### 인증
- `POST /auth/sign-in` — 로그인 (accessToken + httpOnly refresh cookie)
- `POST /auth/sign-out` 🔐 — 로그아웃
- `GET /auth/me` 🔐 — 현재 사용자 정보
- `POST /auth/refresh` — accessToken 갱신

### 사용자
- `POST /users/register` — 회원가입
- `GET /users/me` 🔐 — 내 프로필
- `PATCH /users/me` 🔐 — 프로필 수정

### 강의 (공개)
- `GET /courses` — 카탈로그
- `GET /courses/:slug` — 상세

### 수강
- `POST /enrollments` 🔐 — 수강 신청
- `GET /me/enrollments` 🔐 — 내 수강 목록
- `GET /me/courses` 🔐 — 내 강의 목록
- `PATCH /enrollments/:id` 🔐 — 수강 상태 변경
- `DELETE /enrollments/:id` 🔐 — 수강 취소

### 출석
- `GET /me/attendance/workspace` 🔐 — 출석 워크스페이스
- `POST /attendance/check-in` 🔐 — 체크인 (CHECKED_IN | LATE)

### 과제 (학생)
- `GET /me/assignments/workspace` 🔐 — 나의 과제 목록·제출이력
- `POST /me/assignments/submissions` 🔐 — 과제 제출

### 과제 (강사/관리자)
- `GET /instructor/assignments/workspace` 🔐👨‍🏫 — 강사 워크스페이스
- `POST /instructor/assignments` 🔐👨‍🏫 — 과제 생성
- `PATCH /instructor/assignments/:id` 🔐👨‍🏫 — 과제 수정
- `PUT /instructor/assignments/:id/template` 🔐👨‍🏫 — 템플릿 upsert
- `PATCH /instructor/assignments/submissions/:id` 🔐👨‍🏫 — 리뷰 상태 변경
- `POST /instructor/assignments/submissions/:id/feedback` 🔐👨‍🏫 — 피드백 등록
- `GET /instructor/assignments/:id/timeline` 🔐👨‍🏫 — 타임라인
- `GET /submissions/:id` 🔐 — 제출 상세

### 파일
- `POST /files/presign` 🔐 — S3 Presigned PUT URL 발급
- `POST /files/complete` 🔐 — 업로드 완료 처리
- `GET /files/:fileId` 🔐 — 메타데이터 조회

### 관리자
- `GET /admin/users/workspace` 🔐🔑 — 전체 사용자·수업·멤버 현황
- `GET /admin/users/search` 🔐🔑 — 사용자 검색
- `POST /admin/courses` 🔐🔑 — 수업 생성
- `DELETE /admin/courses/:id` 🔐🔑 — 수업 삭제
- `PUT /admin/courses/:id/members/:userId/role` 🔐🔑 — 멤버 역할 배정
- `DELETE /admin/courses/:id/members/:userId` 🔐🔑 — 멤버 제거
- `GET /admin/schedules/workspace` 🔐🔑 — 일정 워크스페이스
- `POST /admin/schedules` 🔐🔑 — 일정 생성
- `PUT /admin/schedules/:id` 🔐🔑 — 일정 수정
- `DELETE /admin/schedules/:id` 🔐🔑 — 일정 삭제
- `GET /admin/courses/:id/attendance-scope-workspace` 🔐🔑 — 출석 scope 워크스페이스
- `PUT /admin/courses/:id/attendance-scopes` 🔐🔑 — 출석 scope 업데이트
- `GET /courses/:id/assignment-audit` 🔐👨‍🏫 — 감사로그

> 🔐 인증 필요 | 🔑 admin 전용 | 👨‍🏫 instructor/assistant/admin

---

## 4. 서버 검증 규칙

### 수업
- `classScope` 서버 자동 생성 (courseId + title 기반)
- 날짜: `startDate ≤ endDate`, `enrollmentStartDate ≤ enrollmentEndDate ≤ endDate`

### 멤버 권한
- 정원(capacity)은 `STUDENT`만 카운트. INSTRUCTOR, ASSISTANT는 제외

### 일정
- `dateKey` strict `YYYY-MM-DD`
- `visibilityType=global` → `visibilityScope=global` 필수
- `visibilityType=class` → 등록된 classScope만 허용
- `requiresAttendanceCheck=true` → `attendanceWindowEndAt` 필수

### 출석 scope
- 저장 시 `global + classScope` 자동 포함

### 파일 업로드
- MIME 허용 목록: `text/markdown`, `application/pdf`, `image/png`, `image/jpeg`, `image/gif`, `image/webp`
- 최대 크기: 50MB
- checksum: sha256 hex (64자)

### 출석 체크인
- 코드 불일치 → `INVALID_CODE`
- 이미 체크인 → `ALREADY_CHECKED_IN`
- 창 종료 후 → `ATTENDANCE_WINDOW_CLOSED`
- `attendanceWindowStartAt + 10분` 초과 → `LATE`

---

## 5. 보안 현황 (2026-04-12)

| 항목 | 상태 |
|------|------|
| Admin 엔드포인트 AuthGuard | ✅ 완료 |
| 과제/파일 AuthGuard | ✅ 완료 |
| accessToken localStorage 제거 | ✅ 완료 (메모리 전용) |
| 401 자동 갱신 인터셉터 | ✅ 완료 |
| S3 Presigned URL | ✅ 완료 (S3_BUCKET 설정 필요) |
| docker-compose AUTH_TOKEN_SECRET | ✅ 수정 완료 |
| 프론트 middleware.ts 라우트 보호 | ✅ 완료 |
| userId UUID 기반 생성 | ✅ 완료 |
| actorRole user.role 직접 사용 | ✅ 완료 |

---

## 6. 후속 구현 우선순위

### P1 (완료)
- [x] Admin + Assignments + Files AuthGuard/RolesGuard
- [x] docker-compose AUTH_TOKEN_SECRET 수정
- [x] S3 Presigned URL 실제 구현
- [x] accessToken 메모리 전용 + 401 자동 갱신
- [x] Admin Service Prisma 전환
- [x] 출석 지각(isLate) 감지 구현

### P2 (완료)
- [x] 프론트 middleware.ts 라우트 보호
- [x] resolveActorRole → user.role 직접 사용
- [x] Swagger UI 자동 생성

### 남은 P2
- [ ] 강의 영상 업로드/트랜스코딩/플레이어 API
- [ ] AI/분석/알림/퀴즈 모듈 구현
- [ ] AssignmentsRepository Prisma 전환
- [ ] FilesRepository Prisma 전환

---

## 7. 환경변수 참조

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | 서버 포트 | 4000 |
| `CORS_ORIGIN` | 허용 origin | http://localhost:3000 |
| `AUTH_TOKEN_SECRET` | HMAC 서명 시크릿 | fallback (dev only) |
| `DATABASE_URL` | PostgreSQL 연결 URL | - |
| `DATA_SOURCE` | `memory` \| `prisma` | memory |
| `S3_BUCKET_UPLOADS` | S3 버킷명 | (미설정 시 Mock URL) |
| `AWS_REGION` | AWS 리전 | ap-northeast-2 |
| `OPENAI_API_KEY` | OpenAI API 키 | - |

---

## 8. 참고 문서
- **Swagger UI**: `http://localhost:4000/api-docs` (런타임)
- 상세 계약: `./FRONT_HANDOFF_2026-04-09.md`
- 전체 아키텍처: `../../ARCHITECTURE.md`
- 배포 가이드: `../../DEPLOYMENT.md`
- 프론트 구조: `../../front/progress/INFO.md`

---

## 9. 검증 메모 (2026-04-12)
- `npm run build` ✅
- `node --test test/local-runtime-flow.test.js test/front-back-flow.test.js` → 6/6 ✅
- `DATA_SOURCE=prisma` 모드: Prisma migration 완료, seed 적용 후 동작 확인
