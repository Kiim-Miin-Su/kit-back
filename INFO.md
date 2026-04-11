# Backend Architecture Info (2026-04-12)

## 1. 목적
- 프론트 최신 구현과 백엔드 API/검증/도메인 규칙을 맞추기 위한 기준 문서.
- 다음 개발자가 바로 구현을 이어갈 수 있도록 현재 구현 골격 + 후속 우선순위를 함께 기록한다.

## 2. 현재 구현 상태 (Nest 구조)
1. 엔트리
- `src/main.ts`
  - 전역 `ValidationPipe` 적용
  - `transform`, `whitelist`, `forbidNonWhitelisted` 활성화

2. 모듈
- `src/app.module.ts`:
  - `AdminModule`, `AssignmentsModule`, `FilesModule`, `HealthModule` 포함
  - `AuthModule`, `UsersModule`, `CoursesModule`, `EnrollmentsModule`, `AttendanceModule` 포함

3. 관리자 도메인 (`src/admin`)
- 컨트롤러
  - `admin-users.controller.ts`
  - `admin-courses.controller.ts`
  - `admin-schedules.controller.ts`
  - `admin-attendance-scopes.controller.ts`
- 서비스
  - `admin.service.ts`
- DTO/타입/검증
  - `dto/*`
  - `admin.types.ts`
  - `admin.validation.ts`

4. 과제/파일/헬스체크
- `src/assignments`
  - 학생/강사 과제, 제출, 리뷰, 피드백, 타임라인
  - `AssignmentsRepository` + `InMemoryAssignmentsRepository`
- `src/files`
  - `POST /files/presign`
  - `POST /files/complete`
  - `GET /files/:fileId`
- `src/health/health.controller.ts`
  - `GET /healthz`

5. 부분 구현/스텁
5. 인증/사용자/수강/출석
- `src/auth`
  - HMAC 서명 access token
  - refresh cookie + in-memory session repository
  - `AuthGuard`, `RolesGuard`, `CurrentUser`
- `src/users`
  - 사용자 저장소/회원가입/내 정보 수정
- `src/courses`
  - 공개 카탈로그/상세 API
- `src/enrollments`
  - 수강 신청/내 수강/내 강의
- `src/attendance`
  - 학생 출석 워크스페이스/코드 인증

6. 감사로그 엔드포인트
- `src/courses/course-assignment-audit.controller.ts`
  - `GET /courses/:courseId/assignment-audit`

## 3. 현재 엔드포인트
1. 관리자 사용자
- `GET /admin/users/workspace`
- `GET /admin/users/search?query=`

2. 관리자 수업/멤버
- `POST /admin/courses`
- `DELETE /admin/courses/:courseId`
- `PUT /admin/courses/:courseId/members/:userId/role`
- `DELETE /admin/courses/:courseId/members/:userId`

3. 관리자 일정
- `GET /admin/schedules/workspace`
- `POST /admin/schedules`
- `PUT /admin/schedules/:scheduleId`
- `DELETE /admin/schedules/:scheduleId`

4. 출석 scope 정책
- `GET /admin/courses/:courseId/attendance-scope-workspace`
- `PUT /admin/courses/:courseId/attendance-scopes`

5. 수업 감사로그
- `GET /courses/:courseId/assignment-audit`

6. 과제/제출/리뷰
- `GET /me/assignments/workspace`
- `POST /me/assignments/submissions`
- `GET /instructor/assignments/workspace`
- `POST /instructor/assignments`
- `PATCH /instructor/assignments/:assignmentId`
- `PUT /instructor/assignments/:assignmentId/template`
- `PATCH /instructor/assignments/submissions/:submissionId`
- `POST /instructor/assignments/submissions/:submissionId/feedback`
- `GET /submissions/:submissionId`
- `GET /instructor/assignments/:assignmentId/timeline`

7. 파일/헬스체크
- `POST /files/presign`
- `POST /files/complete`
- `GET /files/:fileId`
- `GET /healthz`

## 4. 서버 검증 규칙 (코드 반영)
1. 수업
- `classScope` 서버 자동 생성
- 날짜 검증:
  - `startDate <= endDate`
  - `enrollmentStartDate <= enrollmentEndDate <= endDate`

2. 멤버 권한
- 정원(capacity)은 `STUDENT`만 카운트
- `ASSISTANT`, `INSTRUCTOR`는 정원 계산 제외

3. 일정
- `dateKey` strict `YYYY-MM-DD`
- `visibilityType=global`이면 `visibilityScope=global`
- `visibilityType=class`면 등록된 class scope만 허용
- `requiresAttendanceCheck=true`이면 `attendanceWindowEndAt` 필수

4. 출석 scope
- 저장 시 `global + classScope` 자동 포함

## 5. 후속 구현 우선순위
1. Files owner/권한 검증 보강 (P1)
- presign/complete 시 actor와 owner 관계 검증
- auth guard 적용 전에도 owner spoofing 방지 규칙 명시

2. Prisma 저장소 전환 (P1)
- `AssignmentsRepository`, `FilesRepository`, `Admin` 저장소를 Prisma 구현체로 확장
- `UsersRepository`, `CoursesRepository`, `EnrollmentsRepository`, `AttendanceRepository`도 같은 패턴으로 교체

3. Assignments/Admin 인증 확장 (P1)
- 현재 신규 학생 플로우는 auth 기반으로 동작한다.
- 다음 단계에서 강사/관리자 엔드포인트에도 `AuthGuard`/`RolesGuard`를 본격 적용한다.

4. 강의 영상 업로드/처리 (P2)
- `POST /instructor/videos/upload-init`
- `POST /instructor/videos/upload-part`
- `POST /instructor/videos/upload-complete`
- `GET /instructor/videos/:videoId/status`
- `PATCH /instructor/videos/:videoId/publish`
- 백그라운드 트랜스코딩(HLS), 썸네일, 자막 처리

5. 강의 영상 플레이어 API (P2)
- `GET /lessons/:lessonId/playback-token`
- `GET /lessons/:lessonId/stream-manifest`
- `POST /lessons/:lessonId/watch-events`
- `PATCH /enrollments/:enrollmentId/last-position`

## 6. 권장 데이터 모델
- `users`
- `courses`
- `course_member_bindings`
- `schedules`
- `attendance_scope_policies`
- `assignment_submissions`
- `submission_feedback`
- `course_assignment_audit_events`
- `files`
- `video_assets`
- `video_transcode_jobs`

## 7. 에러코드 권장
- `USER_NOT_FOUND`
- `USER_NAME_MISMATCH`
- `USER_BIRTHDATE_MISMATCH`
- `COURSE_NOT_FOUND`
- `COURSE_CAPACITY_EXCEEDED`
- `INVALID_DATE_WINDOW`
- `INVALID_SCHEDULE_SCOPE`
- `INVALID_ATTENDANCE_WINDOW`
- `INVALID_ATTENDANCE_SCOPE_POLICY`

## 8. 참고 문서
- 상세 계약: `./progress/FRONT_HANDOFF_2026-04-09.md`
- 최신 계획: `./progress/progress_02.md`
- 프론트 구조: `../front/progress/INFO.md`
- 프론트 아키텍처 핸드오프: `../front/progress/architecture.md`
