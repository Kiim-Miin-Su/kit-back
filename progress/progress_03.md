# Backend Progress — 2026-04-13

## 이번 세션 요약

모노레포에서 독립 레포로 전환하면서 로컬 Docker Compose 기반 개발 환경으로 재정비했습니다.

---

## 변경 사항

### 구조 정리
- Azure / AWS 배포 파일 전체 제거
  - `.github/workflows/azure-*.yml` 삭제
  - `infra/azure/` 스크립트 삭제
  - `AZURE_DEPLOY.md` 삭제
- 독립 레포로 분리 (`back/` 단독 레포)

### Docker Compose 환경 정비
| 파일 | 설명 |
|------|------|
| `docker-compose.yml` | PostgreSQL 16 + NestJS 핫 리로드 개발 환경 |
| `docker-compose.prod.yml` | postgres + migrate job + NestJS 프로덕션 빌드 |

- `docker compose up` 한 줄로 전체 개발 스택 실행
- 컨테이너 시작 시 `npm install → prisma generate → prisma migrate deploy → start:dev` 자동 실행
- `.env` 파일 없이도 개발 서버 실행 가능 (기본값 내장)

### 문서 추가
- `Makefile` — 자주 쓰는 명령어 단축키 (`make dev`, `make seed`, `make test`, ...)
- `README.md` — "clone → docker compose up" 30초 시작 가이드로 전면 개편
- `progress/progress_03.md` — 이 파일

---

## 현재 구현 상태 (2026-04-13)

### 완료된 항목

**인증/사용자**
- HMAC access token + httpOnly refresh cookie 인증 구조
- `AuthGuard`, `RolesGuard`, `@CurrentUser()` 데코레이터
- `auth`, `users` — in-memory / Prisma 모두 동작

**강좌/수강/출석**
- 공개 강좌 카탈로그, 수강 신청/관리, 출석 체크
- `courses`, `enrollments`, `attendance` — Prisma 저장소 전환 완료

**과제/제출**
- 학생 과제 제출 / 강사 리뷰·피드백·타임라인 API
- `assignments` — in-memory 기준 동작, Prisma 미전환

**관리자**
- 사용자/수업/멤버/일정/출석scope CRUD
- `admin` — in-memory 기준 동작, Prisma 미전환

**파일**
- presign URL 발급 / 완료 처리 / 메타 조회
- `files` — in-memory 기준 동작, Prisma 미전환

**Prisma / DB**
- `schema.prisma` — 전체 도메인 스키마 정의 완료
- `prisma/migrations/20260411185600_init` — 초기 마이그레이션 적용 검증 완료
- `prisma/seed.ts` — 프론트 aligned mock 데이터 seed 완료

### DATA_SOURCE 스위칭 현황

| 도메인 | memory | prisma |
|--------|:------:|:------:|
| auth | ✅ | ✅ |
| users | ✅ | ✅ |
| courses | ✅ | ✅ |
| enrollments | ✅ | ✅ |
| attendance | ✅ | ✅ |
| assignments | ✅ | ❌ |
| files | ✅ | ❌ |
| admin | ✅ | ❌ |

---

## 다음 구현 우선순위

### P1 — Prisma 저장소 전환

`assignments`, `files`, `admin` 도메인을 Prisma 구현체로 전환합니다.  
이미 `auth/users/courses/enrollments/attendance` 패턴이 잡혀있어 그대로 따라가면 됩니다.

```
src/assignments/prisma-assignments.repository.ts
src/files/prisma-files.repository.ts (presign 로직은 외부 스토리지 의존)
src/admin/prisma-admin.repository.ts (또는 각 서비스에서 직접 PrismaService 주입)
```

### P1 — AuthGuard 적용 범위 확장

현재 `auth`, `users`, `courses`, `enrollments`, `attendance`에만 적용되어 있습니다.  
`assignments`, `admin`, `files` 컨트롤러에도 `@UseGuards(AuthGuard, RolesGuard)` 적용이 필요합니다.

```typescript
// 강사 전용 예시
@UseGuards(AuthGuard, RolesGuard)
@Roles('INSTRUCTOR')
@Post('/instructor/assignments')
```

### P1 — Files owner 검증

`presign` / `complete` 시 `actor`와 `owner` 관계 검증이 현재 없습니다.  
AuthGuard 적용과 함께 owner spoofing 방지 로직을 추가합니다.

### P2 — 강의 영상 업로드/처리

HLS 트랜스코딩 파이프라인, 썸네일, 자막 처리:

```
POST /instructor/videos/upload-init
POST /instructor/videos/upload-part
POST /instructor/videos/upload-complete
GET  /instructor/videos/:videoId/status
PATCH /instructor/videos/:videoId/publish
```

### P2 — 강의 영상 플레이어 API

```
GET  /lessons/:lessonId/playback-token
GET  /lessons/:lessonId/stream-manifest
POST /lessons/:lessonId/watch-events
PATCH /enrollments/:enrollmentId/last-position
```

### P3 — 진도 / 퀴즈 / AI 추천

현재 `ProgressModule`, `QuizzesModule`, `AiModule`, `AnalyticsModule`은 스텁 상태입니다.  
기능 요구사항이 확정되면 순서대로 구현합니다.

---

## 참고 문서

| 문서 | 내용 |
|------|------|
| [`INFO.md`](./INFO.md) | 아키텍처 기준 문서 |
| [`FRONT_HANDOFF_2026-04-09.md`](./FRONT_HANDOFF_2026-04-09.md) | 프론트엔드 API 계약 상세 |
| [`postgres_reference_2026-04-12.md`](./postgres_reference_2026-04-12.md) | Prisma/PostgreSQL 레퍼런스 |
