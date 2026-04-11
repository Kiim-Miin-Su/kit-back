# AI Edu LMS — Backend

NestJS + TypeScript + Prisma ORM 기반 REST API 서버입니다.

---

## 빠른 시작

### 의존성 설치
```bash
npm install
```

### 개발 서버 (메모리 모드)
```bash
npm run start:dev
```
> `DATA_SOURCE=memory` 기본값 — PostgreSQL 없이 in-memory seed로 즉시 실행됩니다.

### 개발 서버 (Prisma 모드)
```bash
# 1. PostgreSQL 실행
docker compose -f ../docker-compose.db.yml up -d

# 2. 환경변수 설정
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_edu

# 3. Prisma 마이그레이션 + seed
npm run prisma:migrate
npm run prisma:seed

# 4. Prisma 모드로 실행
npm run start:dev:prisma
```

### 빌드
```bash
npm run build
```

---

## API 문서 (Swagger UI)

서버 실행 후: **[http://localhost:4000/api-docs](http://localhost:4000/api-docs)**

- Bearer 토큰 인증 지원 (`POST /auth/sign-in` → `accessToken` 복사 → Authorize)
- 모든 엔드포인트에 `@ApiOperation`, `@ApiResponse` 데코레이터 적용

---

## 모듈 구조

```
src/
├── main.ts                     # 서버 진입점 + Swagger 설정
├── app.module.ts               # 루트 모듈
├── prisma/                     # PrismaService (Global)
├── common/data-source.ts       # DATA_SOURCE 환경변수 헬퍼
├── auth/                       # 인증 (HMAC token + httpOnly cookie)
├── users/                      # 회원가입·프로필
├── courses/                    # 강의 카탈로그·감사로그
├── enrollments/                # 수강 신청·내 수강 목록
├── attendance/                 # 출석 체크인 (지각 판정 포함)
├── assignments/                # 과제·제출·리뷰·피드백·타임라인
├── files/                      # S3 Presigned URL 파일 업로드
├── admin/                      # 관리자 수업·멤버·일정·출석 scope
├── health/                     # GET /healthz
└── mock-data/                  # 메모리 모드 seed 데이터
```

---

## 데이터소스 전환 현황

| 모듈 | 메모리 | Prisma |
|------|--------|--------|
| auth | ✅ | ✅ |
| users | ✅ | ✅ |
| courses | ✅ | ✅ |
| enrollments | ✅ | ✅ |
| attendance | ✅ | ✅ |
| **admin** | ✅ | ✅ **신규** |
| assignments | ✅ | ❌ (예정) |
| files | ✅ | ❌ (예정) |

> `DATA_SOURCE=prisma` 환경변수로 전환합니다.

---

## 인증 흐름

1. `POST /auth/sign-in` → `{ accessToken, user }` 반환 + `ai_edu_refresh_token` (httpOnly) + `ai_edu_role` (readable) 쿠키 설정
2. 모든 보호 엔드포인트: `Authorization: Bearer <accessToken>` 헤더 필요
3. `POST /auth/refresh` → refresh cookie로 새 accessToken 발급 (Axios 인터셉터 자동 처리)

---

## 역할 (Role) 체계

| 역할 | 접근 가능 엔드포인트 |
|------|---------------------|
| `ADMIN` | 모든 엔드포인트 |
| `INSTRUCTOR`, `ASSISTANT` | `/instructor/*`, `/courses/:id/assignment-audit` |
| `STUDENT` | `/me/*`, `/attendance/*`, `/submissions/*` |
| 비인증 | `/courses`, `/users/register`, `/auth/*` |

---

## 파일 업로드 흐름

```
클라이언트                     서버                      S3
    │─── POST /files/presign ──→│                         │
    │←── { fileId, uploadUrl } ─│                         │
    │─── PUT <uploadUrl> ───────────────────────────────→│
    │─── POST /files/complete ──→│                        │
    │←── { downloadUrl } ────────│                        │
```

> `S3_BUCKET_UPLOADS` 미설정 시 Mock URL 반환 (개발 환경)

---

## 테스트

```bash
# 통합 테스트 (메모리 모드)
node --test test/local-runtime-flow.test.js test/front-back-flow.test.js

# Prisma 모드 테스트
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_edu npm run test:prisma
```

**현재 테스트 커버리지**: 6 / 6 통과 (로그인→새로고침, 회원가입→수강→출석, 관리자 CRUD, 과제·리뷰·피드백, 파일 업로드)

---

## 개발 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|---------|
| student | `student-demo-01@koreait.academy` | `password123` |
| instructor | `instructor-dev-01@koreait.academy` | `password123` |
| admin | `admin-root@koreait.academy` | `password123` |

---

## Prisma 작업 명령어

```bash
npm run prisma:validate    # 스키마 검증
npm run prisma:generate    # 클라이언트 생성
npm run prisma:migrate     # 마이그레이션 생성 + 적용
npm run prisma:seed        # 개발 seed 데이터 삽입
npm run prisma:studio      # Prisma Studio (GUI)
```

---

## 환경변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | 서버 포트 | 4000 |
| `CORS_ORIGIN` | 허용 origin | http://localhost:3000 |
| `AUTH_TOKEN_SECRET` | HMAC 서명 시크릿 | fallback (dev only) |
| `DATABASE_URL` | PostgreSQL URL | - |
| `DATA_SOURCE` | `memory` \| `prisma` | memory |
| `S3_BUCKET_UPLOADS` | S3 버킷명 | (Mock 사용) |
| `AWS_REGION` | AWS 리전 | ap-northeast-2 |
| `OPENAI_API_KEY` | OpenAI API 키 | - |

---

## 관련 문서

- [`progress/INFO.md`](./progress/INFO.md) — 내부 구현 현황 (엔드포인트 목록, 검증 규칙, 보안 현황)
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — 기여 가이드 (코드 컨벤션, 테스트 작성법)
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — 전체 아키텍처
- [`../DEPLOYMENT.md`](../DEPLOYMENT.md) — 배포 가이드
