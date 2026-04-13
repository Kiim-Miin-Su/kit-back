# Backend Progress — 2026-04-13

## 이번 세션 요약

모노레포에서 독립 레포로 전환하면서 로컬 Docker Compose 기반 개발 환경으로 재정비했습니다.  
이후 보안 점검(dockerignore, gitignore, .env 관리)을 수행하고 수정했습니다.

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
| `docker-compose.yml` | PostgreSQL 16 (trust auth) + NestJS 핫 리로드 개발 환경 |
| `docker-compose.prod.yml` | postgres + migrate job + NestJS 프로덕션 빌드 |

- `docker compose up` 한 줄로 전체 개발 스택 실행
- 컨테이너 시작 시 `npm install → prisma generate → prisma migrate deploy → start:dev` 자동 실행
- `.env` 파일 없이도 개발 서버 실행 가능 (기본값 내장)
- PostgreSQL은 `POSTGRES_HOST_AUTH_METHOD: trust` 방식으로 dev에서 패스워드 불필요

### 보안 점검 및 수정 (2026-04-13)

| 파일 | 문제 | 조치 |
|------|------|------|
| `.dockerignore` | `.env` / `.env.*` 패턴 누락 → Docker 이미지에 포함 위험 | `.env`, `.env.*`, `!.env.example` 추가 |
| `.env.example` | 주석 없이 변수만 나열, 컨텍스트 불명확 | docker/로컬 차이 주석 + 보안 가이드 추가 |

### 문서 추가
- `Makefile` — 자주 쓰는 명령어 단축키
- `README.md` — "clone → docker compose up" 30초 시작 가이드

---

## 보안 설계 요약

### 인증 토큰 (HMAC-SHA256)
- `token-codec.service.ts`: `createHmac('sha256', secret)` + `timingSafeEqual` 서명 검증
- `AUTH_TOKEN_SECRET` 미설정 시:
  - 개발: `runtime-env.ts`의 기본값 `"local-dev-auth-token-secret"` 사용 (보안 무관)
  - 프로덕션: 예외 발생 (`docker-compose.prod.yml`에서 `:?` 필수 변수로 강제)

### 패스워드 해싱
- `users.service.ts`: `scrypt(password, salt, 64)` + 랜덤 16바이트 salt
- 검증 시 `timingSafeEqual` 사용 (timing attack 방지)

### Refresh Cookie
- `httpOnly: true`, `sameSite: "lax"`, `secure: true` (프로덕션)
- 토큰 자체는 localStorage에 저장하지 않음 (auth-store.ts의 partialize 참조)

### 프로덕션 환경 필수 변수 (`:?` 강제)
- `POSTGRES_PASSWORD`
- `CORS_ORIGIN`
- `AUTH_TOKEN_SECRET`

---

## 현재 구현 상태 (2026-04-13)

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

```
src/assignments/prisma-assignments.repository.ts
src/files/prisma-files.repository.ts
src/admin/prisma-admin.repository.ts
```

### P1 — AuthGuard 적용 범위 확장

현재 `auth`, `users`, `courses`, `enrollments`, `attendance`에만 적용.  
`assignments`, `admin`, `files` 컨트롤러에 `@UseGuards(AuthGuard, RolesGuard)` 적용 필요.

```typescript
@UseGuards(AuthGuard, RolesGuard)
@Roles('INSTRUCTOR')
@Post('/instructor/assignments')
```

### P1 — Files owner 검증

`presign` / `complete` 시 actor ↔ owner 관계 검증 추가 필요.

### P2 — 강의 영상 업로드/처리

HLS 트랜스코딩 파이프라인 (`upload-init → upload-part → upload-complete → status → publish`)

### P2 — 강의 영상 플레이어 API

`playback-token`, `stream-manifest`, `watch-events`, `last-position`

---

## 참고 문서

| 문서 | 내용 |
|------|------|
| [`INFO.md`](./INFO.md) | 아키텍처 기준 문서 |
| [`FRONT_HANDOFF_2026-04-09.md`](./FRONT_HANDOFF_2026-04-09.md) | 프론트엔드 API 계약 상세 |
| [`postgres_reference_2026-04-12.md`](./postgres_reference_2026-04-12.md) | Prisma/PostgreSQL 레퍼런스 |
