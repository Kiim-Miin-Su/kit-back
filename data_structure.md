# DB 구현 계획 (Prisma/PostgreSQL)

> 참고 레퍼런스와 판단 근거는 `./progress/postgres_reference_2026-04-12.md`를 기준으로 본다.

## 1. 목표
- 현재 in-memory 도메인(`auth`, `users`, `courses`, `enrollments`, `attendance`, `admin`, `assignments`, `files`)을 Prisma 저장소로 단계 전환.
- front 계약을 깨지 않고 API 응답 구조를 유지.
- 제출/리뷰/첨부/감사로그 흐름을 트랜잭션 단위로 보장.

## 1-1. 현재 스키마 상태 판단
- `prisma/schema.prisma`는 현재 REST 계약 기준으로 재작성 완료 상태다.
- 핵심 도메인인 `attendance_scope_policies`, `submission_revisions`, `feedback_attachments`, `file ownership`, `auth refresh sessions`를 직접 모델링했다.
- `prisma/migrations/20260411185600_init` 기준 초기 migration 생성/적용까지 끝났다.
- 현재 남은 일은 스키마 재작성 자체가 아니라 남은 도메인의 Prisma 저장소 확장이다.

## 2. 전환 원칙
- 현재 repository 계약은 `async read()/write()` 기준으로 정리됐다.
- `InMemory*Repository`와 `Prisma*Repository`를 병행하고 provider 스위칭한다.
- 에러코드/검증 규칙은 서비스 레이어에서 유지.

## 3. 핵심 테이블 설계 (신규/보강)

### 3.1 인증/사용자/수업 운영
- `auth_refresh_sessions`
  - `id` (PK), `session_id` (unique), `user_id` FK, `created_at`, `expires_at`, `revoked_at`
- `users`
  - `id` (PK), `user_id` (unique), `name`, `birth_date`, `default_role`, timestamps
- `courses`
  - `id` (PK), `course_id` (unique), `title`, `category`, `class_scope` (unique), `status`, `capacity`, date window, `pacing_type`
- `course_members`
  - `course_id` FK, `user_id` FK, `role`
  - unique `(course_id, user_id)`
- `schedules`
  - `id` (PK), `date_key`, `title`, `visibility_type`, `visibility_scope`, attendance window, `source_type`
- `course_attendance_scopes`
  - `course_id` FK, `scope`
  - unique `(course_id, scope)`

### 3.2 과제/제출/리뷰
- `assignments`
  - `id` (PK), `assignment_id` (unique), `course_id` FK, `title`, `prompt`, `due_at`, flags
- `assignment_templates`
  - `id` (PK), `assignment_id` FK, `editor_type`, `code_language`, `title`, `content`, updater fields
  - unique `(assignment_id, editor_type, code_language)`
- `submission_revisions`
  - `id` (PK), `submission_id` (logical group id), `assignment_id` FK, `course_id` FK
  - `student_id` FK, `revision`, `review_status`, `message`, `code`, `code_language`, `editor_type`
  - unique `(assignment_id, student_id, revision)`
- `submission_feedback_entries`
  - `id` (PK), `submission_revision_id` FK, reviewer fields, message/code payload, optional `review_status`
- `submission_timeline_events`
  - `id` (PK), `submission_revision_id` FK nullable, `type`, actor fields, `note`, `created_at`
- `course_assignment_audit_events`
  - `id` (PK), `course_id` FK, `assignment_id`, optional `submission_revision_id`, actor/action/note, `occurred_at`

### 3.3 파일 업로드
- `files`
  - `id` (PK), `file_id` (unique), `owner_id` FK(users.user_id), `file_name`, `bucket_key` (unique)
  - `content_type`, `size`, `checksum`, `status`, `upload_url`, `download_url`, timestamps
- `submission_attachments`
  - `submission_revision_id` FK, `file_id` FK
  - `snapshot_file_name`, `snapshot_mime_type`, `snapshot_size_bytes`
  - unique `(submission_revision_id, file_id)`
- `feedback_attachments`
  - `feedback_entry_id` FK, `file_id` FK
  - snapshot columns 동일

## 4. 인덱스 전략
- 조회 중심 인덱스
  - `submission_revisions (student_id, submitted_at desc)`
  - `submission_revisions (assignment_id, submitted_at desc)`
  - `submission_revisions (course_id, submitted_at desc)`
  - `submission_feedback_entries (submission_revision_id, created_at desc)`
  - `submission_timeline_events (submission_revision_id, created_at desc)`
  - `course_assignment_audit_events (course_id, occurred_at desc)`
- 검색 인덱스
  - `users (user_id)`, `users (name)`, `users (birth_date)`

## 5. 무결성/검증 규칙 매핑
- 파일 첨부 검증
  - file 미존재 -> `ATTACHMENT_FILE_NOT_FOUND`
  - 소유자 불일치 -> `ATTACHMENT_FILE_FORBIDDEN`
  - 업로드 미완료 -> `ATTACHMENT_FILE_NOT_READY`
- 제출 검증
  - 비수강 과제 제출 차단, 빈 제출 차단, revision 자동 증가
- 정원 정책
  - `course_members`에서 `role=STUDENT`만 capacity 카운트

## 6. 마이그레이션 단계
1. 스키마/seed 유지
- 현재 `schema.prisma`와 `prisma/seed.ts`를 기준 계약으로 유지하고 migration을 생성한다.

2. Repository 구현
- 완료:
  - `PrismaUsersRepository`
  - `PrismaCoursesRepository`
  - `PrismaEnrollmentsRepository`
  - `PrismaAttendanceRepository`
  - `PrismaAuthSessionRepository`
- 남음:
- `PrismaAssignmentsRepository`
- `PrismaFilesRepository`
- `PrismaAdminRepository`

3. provider 스위칭
- 완료:
  - 환경변수(`DATA_SOURCE=memory|prisma`)로 `auth`, `users`, `courses`, `enrollments`, `attendance` 전환
- 남음:
  - `assignments`, `files`, `admin`

4. 회귀 검증
- 완료:
  - 기존 테스트를 `DATA_SOURCE=prisma`로도 통과 확인
- 남음:
  - Prisma 전용 분리 테스트 및 seed/reset 헬퍼 정리

## 7. 완료 정의(DoD)
- in-memory/prisma 모드 모두 기존 API 계약을 유지.
- front->back 핵심 4개 흐름 테스트 통과.
- 파일/제출/감사로그 트랜잭션 일관성 보장.
- 운영 문서(`progress/progress_01.md`, `progress/INFO.md`) 업데이트 완료.
