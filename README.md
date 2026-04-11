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
- `src/admin`: 관리자 수업/멤버/일정/출석 scope/감사로그
- `src/assignments`: 학생/강사 과제/제출/리뷰/타임라인
- `src/files`: presign/complete/메타 조회
- `src/health`: `GET /healthz`
- `src/courses/course-assignment-audit.controller.ts`: 수업 감사로그 API
- `prisma/schema.prisma`: DB 스키마 초안

## 현재 구현 상태
- 구현 완료: `admin`, `assignments`, `files`, `health`, `auth`, `users`, `courses`, `enrollments`, `attendance`
- 인증은 로컬 HMAC access token + refresh cookie 구조로 동작한다.
- 저장소는 `interface -> in-memory repository -> service -> controller` 패턴으로 분리되어 있다.

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
1. Files owner 검증 보강
2. Assignments/Admin에도 AuthGuard 확장
3. Prisma 저장소 전환
4. 영상 업로드/트랜스코딩
5. 플레이어 토큰/진도 API

## 로컬 계정
- `student-demo-01@koreait.academy / password123`
- `instructor-dev-01@koreait.academy / password123`
- `admin-root@koreait.academy / password123`

## 문서
- 아키텍처 기준: `INFO.md`
- 최신 계획: `progress/progress_02.md`
- 프론트 상세 핸드오프: `progress/FRONT_HANDOFF_2026-04-09.md`
- 프론트 아키텍처 문서: `../front/progress/architecture.md`
