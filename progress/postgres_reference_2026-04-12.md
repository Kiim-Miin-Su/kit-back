# PostgreSQL Reference Notes (2026-04-12)

## 목적
- 현재 프로젝트와 비슷한 GitHub 레퍼런스를 기준으로 PostgreSQL + Prisma 전환 방향을 고정한다.
- 지금 코드의 계약과 어긋나는 generic LMS 스키마를 그대로 밀지 않고, 현재 REST 계약 기준으로 DB 모델을 다시 잠근다.
- 문서화부터 시작하고, 이후 구현은 `interface -> prisma repository` 순서로 진행한다.

## 참고한 레퍼런스
1. `notiz-dev/nestjs-prisma-starter`
- 링크: https://github.com/notiz-dev/nestjs-prisma-starter
- 참고 포인트:
  - NestJS + Prisma + PostgreSQL + JWT + Docker 기본 조합
  - `.env` + `docker-compose` + `prisma migrate dev/deploy` 운영 흐름
  - 인증/DB/문서화 구성을 처음부터 분리해 두는 패턴
- 우리 프로젝트에 적용할 점:
  - `PrismaService` / `PrismaModule` 도입
  - `docker-compose.db.yml` 또는 동등한 dev DB 실행 문서
  - `migrate dev`, `migrate deploy`, `generate`, `seed` 스크립트 정리

2. `prisma/blog-backend-rest-api-nestjs-prisma`
- 링크: https://github.com/prisma/blog-backend-rest-api-nestjs-prisma
- 참고 포인트:
  - REST API 기준의 단순한 Prisma + PostgreSQL + Docker 흐름
  - 로컬 DB 실행 -> migration -> 서버 실행 순서가 명확함
- 우리 프로젝트에 적용할 점:
  - 현재 프로젝트도 GraphQL이 아니라 REST 중심이므로 이 흐름이 더 직접적이다.
  - 문서와 스크립트는 복잡한 boilerplate보다 `docker-compose up -> prisma migrate dev -> start:dev` 순서로 단순화한다.

3. `prisma/prisma-examples`
- 링크: https://github.com/prisma/prisma-examples
- 링크: https://github.com/prisma/prisma-examples/tree/latest/orm/nest
- 링크: https://github.com/prisma/prisma-examples/tree/latest/orm/nextjs
- 참고 포인트:
  - 공식 예제 저장소
  - Next.js 15 App Router + Prisma Postgres 예제와 Nest REST API 예제를 함께 제공
- 우리 프로젝트에 적용할 점:
  - 프론트/백 모두 TypeScript인 만큼 Prisma Client 생성 위치와 사용 범위를 일관되게 관리한다.
  - 공식 예제 수준의 최소 구성부터 시작하고, 과한 abstraction은 피한다.

4. `MrChike/LMS`
- 링크: https://github.com/MrChike/LMS
- 참고 포인트:
  - LMS 도메인에서 RBAC, teacher/student/public 분리, PostgreSQL, Docker 조합
  - auth provider 종속을 줄이고 custom backend API로 분리하려는 방향
- 우리 프로젝트에 적용할 점:
  - 학생/강사/관리자 권한 분리는 DB 스키마에 명시적으로 반영한다.
  - auth provider나 프론트 프레임워크에 종속되지 않는 course/enrollment/assignment 중심 모델이 필요하다.

5. `DevKrishnasai/lms`
- 링크: https://github.com/DevKrishnasai/lms
- 참고 포인트:
  - student / teacher 역할 분리
  - course, enrollment, completion 중심의 LMS 기본 축
- 우리 프로젝트에 적용할 점:
  - course/enrollment/lesson 축은 유지하되, 현재 프로젝트에 중요한 `admin schedules`, `attendance scopes`, `submission revisions`, `files`를 별도 1급 모델로 올린다.

6. Prisma 공식 문서
- PostgreSQL connector: https://docs.prisma.io/docs/v6/orm/overview/databases/postgresql
- PostgreSQL quickstart: https://docs.prisma.io/docs/prisma-orm/quickstart/postgresql
- 참고 포인트:
  - `DATABASE_URL`
  - `prisma migrate dev`
  - `prisma generate`
  - PostgreSQL connector 기준 설정

## 레퍼런스 기반 판단
1. 유지할 것
- 저장소 인터페이스 분리
- 로컬 메모리 구현과 Prisma 구현 병행
- access/refresh 인증 구조
- role 기반 접근 제어

2. 버릴 것
- 현재 `prisma/schema.prisma`의 generic course/lesson/quiz 중심 LMS 스키마를 그대로 확장하는 접근
- 이유:
  - 현재 runtime 계약은 `admin schedules`, `attendance scopes`, `submission revisions`, `feedback attachments`, `file ownership`가 핵심인데 현 스키마는 그 축과 많이 어긋난다.
  - 지금 스키마는 “일반 LMS 예시”에 가깝고, 현재 프론트/백 계약의 단일 진실 소스가 아니다.

3. 새로 잠글 것
- 계약 우선 스키마
- PostgreSQL 우선 인덱스 설계
- migration/seed/rollback 문서
- `memory | prisma` provider 스위치

## 현재 코드 기준 부족한 부분
1. Prisma 런타임 계층 없음
- `PrismaService`, `PrismaModule`, `prisma/seed.ts` 부재

2. 현재 스키마와 런타임 계약 불일치
- 현재 코드 기준 핵심 도메인:
  - users/auth sessions
  - courses/public catalog
  - enrollments
  - schedules
  - attendance scope policies
  - assignments
  - assignment templates
  - submission revisions
  - feedback entries
  - submission timeline
  - files
- 현 `schema.prisma`는 위 모델과 1:1 대응이 아니다.

3. 전환 운영 문서 부족
- `.env.example` 수준의 Postgres 실행 예시 부족
- Prisma migration / generate / seed / deploy 순서가 문서에 고정되어 있지 않음

## PostgreSQL 전환 결정
1. DB
- PostgreSQL
- ORM은 Prisma 유지

2. 전환 원칙
- 현재 REST DTO/응답 구조를 우선 고정
- DB는 그 계약을 저장할 수 있게 설계
- 프론트 계약을 DB에 맞추지 않고, DB를 계약에 맞춘다

3. provider 전략
- `DATA_SOURCE=memory | prisma`
- 개발 초반에는 기본 `memory`
- schema/migrate/seed가 안정화되면 `prisma` 병행

## 스키마 재작성 대상
1. 인증/사용자
- `users`
- `auth_refresh_sessions`

2. 수업/수강/운영
- `courses`
- `course_members`
- `enrollments`
- `schedules`
- `attendance_scope_policies`

3. 과제/제출
- `assignments`
- `assignment_templates`
- `submission_revisions`
- `submission_feedback_entries`
- `submission_timeline_events`
- `course_assignment_audit_events`

4. 파일
- `files`
- `submission_attachments`
- `feedback_attachments`

## 바로 다음 문서 작업
1. `back/data_structure.md`
- 위 계약 우선 테이블 구조로 재정리

2. `back/INFO.md`
- 현재 generic Prisma 스키마는 참조용이 아니라 교체 대상이라는 점 명시

3. `back/progress/progress_02.md`
- Prisma 전환 작업을 `schema rewrite -> migration -> seed -> prisma repository -> switch` 순서로 재정렬

## 구현 순서 제안
1. 스키마 재작성 문서 확정
2. `schema.prisma` 계약 우선 재작성
3. `PrismaService` / `PrismaModule` / `seed.ts` 추가
4. `UsersRepository`, `CoursesRepository`, `EnrollmentsRepository`부터 Prisma 구현체 추가
5. `Assignments`, `Files`, `Admin`, `Attendance` 순으로 Prisma 구현체 확장
6. `DATA_SOURCE=prisma` 통합 테스트 추가
