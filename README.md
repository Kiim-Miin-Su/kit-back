# AI Edu LMS — Backend

NestJS + Prisma 기반 AI 교육 LMS REST API 서버입니다.

---

## 시작하기

기본 개발 경로는 Docker Compose입니다.

사전 점검부터 하고 싶다면:

```bash
# macOS / Linux / WSL
bash ./scripts/setup-dev.sh --preset=compose
```

```powershell
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-dev.ps1 -Preset compose
```

위 스크립트는 Docker/Node/npm 존재 여부를 확인하고, 없으면 설치 명령 예시를 보여주며, `.env`가 없을 때 compose용 `.env`도 만들어 줍니다.

```bash
git clone <repo-url>
cd back
make run
```

처음 실행 시 `npm install` → `prisma generate` → `prisma migrate deploy` → 서버 시작이 자동으로 진행됩니다.

직접 compose 명령을 쓰고 싶다면 아래도 동일하게 동작합니다.

```bash
bash ./scripts/run-dev.sh
```

| 서비스 | URL |
|--------|-----|
| REST API | http://localhost:4000 |
| 헬스 체크 | http://localhost:4000/healthz |

> `OPENAI_API_KEY`가 필요한 기능은 `.env.example`을 복사해서 키를 입력하세요.

---

## 자주 쓰는 명령어

```bash
make setup      # 사전 요구사항 점검 + compose용 .env 생성
make env        # compose용 .env 생성
make env-local  # 로컬 Node.js 실행용 .env 생성
make run        # clone 직후 실행용: setup 후 docker compose up
make dev        # 개발 서버 실행 (= docker compose up)
make logs       # 로그 스트리밍
make seed       # 개발용 테스트 데이터 적재
make test       # 통합 테스트 실행
make shell      # 컨테이너 내부 쉘 진입
make studio     # Prisma Studio (DB GUI) 실행
make reset      # DB 초기화 후 재시작
make help       # 전체 명령어 목록
```

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | NestJS 11, TypeScript |
| ORM | Prisma 6, PostgreSQL 16 |
| 인증 | HMAC 커스텀 토큰 + httpOnly refresh cookie |
| API 문서 | 현재 미구현 |
| 컨테이너 | Docker Compose |

---

## 환경 변수

개발용 Docker Compose는 `.env` 없이도 실행되지만, `make run` 또는 `bash ./scripts/run-dev.sh`를 쓰면 `.env`가 없을 때 자동으로 생성한 뒤 실행합니다. `.env`만 먼저 만들고 싶다면 아래 명령을 사용하세요.

```bash
npm run setup:env
```

| 변수 | 개발 기본값 | 설명 |
|------|------------|------|
| `PORT` | `4000` | 서버 포트 |
| `DATA_SOURCE` | `prisma` (compose) / `memory` (직접실행) | `memory` \| `prisma` |
| `POSTGRES_PASSWORD` | 프로덕션에서만 설정 | PostgreSQL 비밀번호 |
| `DATABASE_URL` | `postgresql://postgres@postgres:5432/ai_edu` (compose) | PostgreSQL 연결 URL |
| `CORS_ORIGIN` | `http://localhost:3000` | 허용할 프론트엔드 origin |
| `AUTH_TOKEN_SECRET` | 개발 시 내장 fallback / 프로덕션은 `.env` 필수 | HMAC 서명 시크릿 |
| `OPENAI_API_KEY` | 비워 둠 | 향후 AI 기능용 API 키 (현재 선택) |

`.env` 생성 프리셋:

```bash
# Docker Compose용 .env 생성
npm run setup:env

# 로컬 Node.js + localhost postgres용 .env 생성
npm run setup:env:local
```

주의:
- `npm run setup:env`는 `DATABASE_URL=postgresql://postgres@postgres:5432/ai_edu`로 생성됩니다.
- `npm run setup:env:local`은 `DATABASE_URL=postgresql://postgres@localhost:5432/ai_edu`로 생성됩니다.
- `local` 프리셋으로 만든 `.env`를 그대로 `docker compose up`에 쓰면 컨테이너 내부 DB 연결이 깨질 수 있습니다.

---

## 로컬 직접 실행 (Node.js 20+)

Docker 없이 Node.js로 직접 실행하는 경우:

```bash
# 1. 의존성 설치
npm install

# 2. .env 생성
npm run setup:env:local

# 3. PostgreSQL만 Docker로 실행
docker compose up postgres -d

# 4. Prisma 준비
npm run prisma:generate
npm run prisma:migrate   # 마이그레이션 생성 + 적용

# 5. (선택) 테스트 데이터
npm run prisma:seed

# 6. 개발 서버 실행
npm run start:dev:prisma  # Prisma 모드
npm run start:dev         # in-memory 모드 (DB 불필요)
```

Windows에서 WSL, Docker Desktop, PostgreSQL까지 같이 점검하거나 설치 명령을 받고 싶다면:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-dev.ps1 -Preset local-node
```

---

## 프로젝트 구조

```
back/
├── src/
│   ├── main.ts                 # 전역 ValidationPipe, CORS 설정
│   ├── app.module.ts           # 루트 모듈
│   ├── common/
│   │   └── data-source.ts      # DATA_SOURCE 스위칭 헬퍼
│   ├── auth/                   # HMAC 토큰 + refresh cookie 인증
│   ├── users/                  # 회원가입, 내 정보
│   ├── courses/                # 강좌 카탈로그, 감사로그
│   ├── enrollments/            # 수강 신청/관리
│   ├── attendance/             # 출석 체크, 워크스페이스
│   ├── assignments/            # 과제/제출/리뷰/피드백
│   ├── admin/                  # 관리자 사용자·수업·일정·출석 scope
│   ├── files/                  # presign URL, 파일 메타
│   ├── health/                 # GET /healthz
│   └── prisma/                 # PrismaService, PrismaModule
├── prisma/
│   ├── schema.prisma           # DB 스키마
│   ├── seed.ts                 # 개발용 seed 데이터
│   └── migrations/             # Prisma 마이그레이션 이력
├── test/                       # 통합 테스트 (Node test runner)
├── Dockerfile                  # 멀티스테이지 빌드 (deps → build → migrate → runtime)
├── docker-compose.yml          # 개발 환경 (postgres + back, 핫 리로드)
├── docker-compose.prod.yml     # 프로덕션 환경 (빌드 이미지 + migrate job)
├── Makefile                    # 자주 쓰는 명령어 단축키
└── .env.example                # 환경 변수 템플릿
```

---

## 저장소 패턴 (DATA_SOURCE 스위칭)

각 도메인은 `interface → repository → service → controller` 구조를 따릅니다.

```
DATA_SOURCE=memory  →  InMemory*Repository  (DB 없이 즉시 동작)
DATA_SOURCE=prisma  →  Prisma*Repository    (PostgreSQL 연결 필요)
```

| 도메인 | memory | prisma |
|--------|--------|--------|
| auth | ✅ | ✅ |
| users | ✅ | ✅ |
| courses | ✅ | ✅ |
| enrollments | ✅ | ✅ |
| attendance | ✅ | ✅ |
| assignments | ✅ | 미구현 |
| files | ✅ | 미구현 |
| admin | ✅ | 미구현 |

---

## API 엔드포인트

전체 목록은 Swagger UI(http://localhost:4000/api-docs)에서 확인하세요.

### 인증
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/auth/sign-in` | 로그인 (access token 발급) |
| `POST` | `/auth/sign-out` | 로그아웃 |
| `GET` | `/auth/me` | 현재 사용자 정보 |
| `POST` | `/auth/refresh` | access token 갱신 |

### 사용자
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/users/register` | 회원가입 |
| `GET` | `/users/me` | 내 정보 조회 |
| `PATCH` | `/users/me` | 내 정보 수정 |

### 강좌
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/courses` | 공개 강좌 목록 |
| `GET` | `/courses/:slug` | 강좌 상세 |
| `GET` | `/me/courses` | 내 수강 강좌 목록 |
| `GET` | `/courses/:courseId/assignment-audit` | 수업 감사로그 |

### 수강
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/enrollments` | 수강 신청 |
| `GET` | `/me/enrollments` | 내 수강 목록 |
| `PATCH` | `/enrollments/:enrollmentId` | 수강 상태 변경 |
| `DELETE` | `/enrollments/:enrollmentId` | 수강 취소 |

### 출석
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/me/attendance/workspace` | 출석 워크스페이스 |
| `POST` | `/attendance/check-in` | 출석 체크 |

### 과제 (학생)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/me/assignments/workspace` | 내 과제 워크스페이스 |
| `POST` | `/me/assignments/submissions` | 과제 제출 |
| `GET` | `/submissions/:submissionId` | 제출 상세 조회 |

### 과제 (강사)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/instructor/assignments/workspace` | 강사 과제 워크스페이스 |
| `POST` | `/instructor/assignments` | 과제 생성 |
| `PATCH` | `/instructor/assignments/:assignmentId` | 과제 수정 |
| `PUT` | `/instructor/assignments/:assignmentId/template` | 템플릿 업서트 |
| `PATCH` | `/instructor/assignments/submissions/:submissionId` | 제출 상태 변경 |
| `POST` | `/instructor/assignments/submissions/:submissionId/feedback` | 피드백 추가 |
| `GET` | `/instructor/assignments/:assignmentId/timeline` | 타임라인 조회 |

### 파일
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/files/presign` | presign URL 발급 |
| `POST` | `/files/complete` | 업로드 완료 처리 |
| `GET` | `/files/:fileId` | 파일 메타 조회 |

### 관리자
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/admin/users/workspace` | 사용자 전체 목록 |
| `GET` | `/admin/users/search` | 사용자 검색 |
| `POST` | `/admin/courses` | 수업 생성 |
| `DELETE` | `/admin/courses/:courseId` | 수업 삭제 |
| `PUT` | `/admin/courses/:courseId/members/:userId/role` | 멤버 역할 변경 |
| `DELETE` | `/admin/courses/:courseId/members/:userId` | 멤버 제거 |
| `GET` | `/admin/schedules/workspace` | 일정 워크스페이스 |
| `POST` | `/admin/schedules` | 일정 생성 |
| `PUT` | `/admin/schedules/:scheduleId` | 일정 수정 |
| `DELETE` | `/admin/schedules/:scheduleId` | 일정 삭제 |
| `GET` | `/admin/courses/:courseId/attendance-scope-workspace` | 출석 scope 워크스페이스 |
| `PUT` | `/admin/courses/:courseId/attendance-scopes` | 출석 scope 정책 저장 |

### 기타
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/healthz` | 헬스 체크 |

---

## Prisma 명령어

```bash
npm run prisma:generate       # 클라이언트 생성
npm run prisma:validate       # 스키마 검증
npm run prisma:migrate        # 마이그레이션 생성 + 적용 (dev)
npm run prisma:migrate:deploy # 마이그레이션 적용만 (prod)
npm run prisma:seed           # seed 데이터 적재
npm run prisma:studio         # Prisma Studio (DB GUI)
```

---

## 테스트

```bash
# Docker 환경에서
make test

# 직접 실행
npm test                       # in-memory 모드
npm run test:prisma            # Prisma 모드 (DB 실행 필요)
```

---

## 프로덕션 실행

```bash
# 1. 환경 변수 파일 준비
cp .env.example .env
# 필수 수정: POSTGRES_PASSWORD, AUTH_TOKEN_SECRET, CORS_ORIGIN

# 2. 빌드 + migrate + 실행
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

---

## 개발 테스트 계정

`make seed` 실행 후 사용 가능합니다.

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 학생 | `student-demo-01@koreait.academy` | `password123` |
| 강사 | `instructor-dev-01@koreait.academy` | `password123` |
| 관리자 | `admin-root@koreait.academy` | `password123` |

---

## 상세 문서

| 문서 | 설명 |
|------|------|
| [`progress/INFO.md`](./progress/INFO.md) | 아키텍처 기준 및 후속 구현 우선순위 |
| [`progress/progress_03.md`](./progress/progress_03.md) | 최신 진행 상황 (2026-04-13) |
| [`progress/FRONT_HANDOFF_2026-04-09.md`](./progress/FRONT_HANDOFF_2026-04-09.md) | 프론트엔드 연동 계약 상세 |
| [`data_structure.md`](./data_structure.md) | 도메인 데이터 구조 정리 |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 기여 가이드 |
