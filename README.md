# AI Edu LMS Backend

NestJS 기반 백엔드 저장소입니다.

## 실행
1. 의존성 설치
```bash
npm install
```

2. 개발 서버
```bash
npm run start:dev
```

3. 빌드
```bash
npm run build
```

## 현재 구현 구조
- `src/main.ts`: 전역 ValidationPipe
- `src/app.module.ts`: 루트 모듈
- `src/prisma`: `PrismaModule`, `PrismaService`
- `src/admin`: 관리자 수업/멤버/일정/출석 scope/감사로그
- `src/assignments`: 학생/강사 과제/제출/리뷰/타임라인
- `src/files`: presign/complete/메타 조회
- `src/health`: `GET /healthz`
- `src/courses/course-assignment-audit.controller.ts`: 수업 감사로그 API
- `prisma/schema.prisma`: 현재 REST 계약 기준 PostgreSQL/Prisma 스키마
- `prisma/seed.ts`: front-aligned mock seed를 Prisma seed로 이관한 개발용 seed
- `../docker-compose.db.yml`: 로컬 PostgreSQL 실행용 compose 파일

## 현재 구현 상태
- 구현 완료: `admin`, `assignments`, `files`, `health`, `auth`, `users`, `courses`, `enrollments`, `attendance`
- 인증은 로컬 HMAC access token + refresh cookie 구조로 동작한다.
- 저장소는 `interface -> in-memory repository -> service -> controller` 패턴으로 분리되어 있다.
- Prisma/PostgreSQL 전환 1단계로 schema rewrite, seed, `PrismaModule` scaffold는 완료됐다.
- 아직 런타임 provider 스위칭은 하지 않았고, 실제 요청 처리는 in-memory 저장소가 담당한다.
- 현재 repository 계약이 동기식 `read()/write()` 스냅샷 API라서, Prisma 전환 전 `async` 메서드 기반 계약으로 한 번 정리하는 작업이 필요하다.

## 현재 API
- `POST /auth/sign-in`
- `POST /auth/sign-out`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /users/register`
- `GET /users/me`
- `PATCH /users/me`
- `GET /courses`
- `GET /courses/:slug`
- `GET /me/courses`
- `POST /enrollments`
- `GET /me/enrollments`
- `PATCH /enrollments/:enrollmentId`
- `DELETE /enrollments/:enrollmentId`
- `GET /me/attendance/workspace`
- `POST /attendance/check-in`
- `GET /admin/users/workspace`
- `GET /admin/users/search`
- `POST /admin/courses`
- `DELETE /admin/courses/:courseId`
- `PUT /admin/courses/:courseId/members/:userId/role`
- `DELETE /admin/courses/:courseId/members/:userId`
- `GET /admin/schedules/workspace`
- `POST /admin/schedules`
- `PUT /admin/schedules/:scheduleId`
- `DELETE /admin/schedules/:scheduleId`
- `GET /admin/courses/:courseId/attendance-scope-workspace`
- `PUT /admin/courses/:courseId/attendance-scopes`
- `GET /courses/:courseId/assignment-audit`

## 다음 구현 우선순위
1. Prisma 저장소 구현체 추가 + `DATA_SOURCE=memory|prisma` provider 스위칭
2. Files owner 검증 보강
3. Assignments/Admin에도 AuthGuard 확장
4. 영상 업로드/트랜스코딩
5. 플레이어 토큰/진도 API

## PostgreSQL/Prisma 로컬 작업
1. PostgreSQL 실행
```bash
docker compose -f ../docker-compose.db.yml up -d
```

2. Prisma schema 검증
```bash
npm run prisma:validate
```

3. Prisma client 생성
```bash
npm run prisma:generate
```

4. 마이그레이션 생성/적용
```bash
npm run prisma:migrate
```

5. 개발 seed 실행
```bash
npm run prisma:seed
```

## 로컬 계정
- `student-demo-01@koreait.academy / password123`
- `instructor-dev-01@koreait.academy / password123`
- `admin-root@koreait.academy / password123`

## 문서
- 아키텍처 기준: `INFO.md`
- 최신 계획: `progress/progress_02.md`
- PostgreSQL 레퍼런스: `progress/postgres_reference_2026-04-12.md`
- 프론트 상세 핸드오프: `progress/FRONT_HANDOFF_2026-04-09.md`
- 프론트 아키텍처 문서: `../front/progress/architecture.md`
