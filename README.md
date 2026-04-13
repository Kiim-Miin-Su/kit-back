# AI Edu LMS — Backend

NestJS + Prisma 기반 AI 교육 LMS REST API 서버입니다.

---

## 시작하기

**사전 요구사항:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치

```bash
git clone <repo-url>
cd back
./setup.sh
```

> **Windows 사용자:** Git Bash / WSL2 터미널에서 실행하세요.  
> PowerShell: `scripts/setup-dev.ps1` → `docker compose up -d`

`setup.sh`가 자동으로 처리합니다:

1. Docker 설치 및 실행 여부 확인 (미설치 시 OS별 설치 가이드 출력)
2. `.env` 파일 자동 생성 (없을 경우 `.env.example` 기반으로 생성)
3. PostgreSQL + NestJS 컨테이너 시작
4. 컨테이너 내부: `npm install` → `prisma generate` → `prisma migrate deploy` → 서버 시작
5. 서버 헬스체크 통과 대기 (최대 3분)
6. 개발용 테스트 seed 데이터 자동 적재

| 서비스 | URL |
|--------|-----|
| REST API | http://localhost:4000 |
| Swagger UI | http://localhost:4000/api-docs |
| 헬스 체크 | http://localhost:4000/healthz |

```bash
./setup.sh --no-seed    # seed 없이 실행
./setup.sh --install    # Docker 자동 설치 포함 (macOS Homebrew / Linux apt)
```

---

## 이후 실행

```bash
make dev        # 서버 재시작 (docker compose up)
make logs       # 로그 스트리밍
make stop       # 서버 중지
```

전체 명령어: `make help`

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | NestJS 11, TypeScript |
| ORM | Prisma 6, PostgreSQL 16 |
| 인증 | HMAC 커스텀 토큰 + httpOnly refresh cookie |
| API 문서 | Swagger UI (`/api-docs`) |
| 컨테이너 | Docker Compose |

---

## 환경 변수

`setup.sh`가 `.env.example`을 자동으로 복사합니다. 아래 값을 바꾸고 싶을 때만 `.env`를 편집하세요.

| 변수 | 개발 기본값 | 설명 |
|------|------------|------|
| `PORT` | `4000` | 서버 포트 |
| `DATA_SOURCE` | `prisma` | `memory` \| `prisma` |
| `DATABASE_URL` | `postgresql://postgres@postgres:5432/ai_edu` | PostgreSQL 연결 URL |
| `CORS_ORIGIN` | `http://localhost:3000` | 허용할 프론트엔드 origin |
| `AUTH_TOKEN_SECRET` | _(코드 기본값 사용)_ | HMAC 서명 시크릿 (프로덕션 필수) |
| `OPENAI_API_KEY` | _(비어있음)_ | OpenAI API 키 |

---

## 로컬 직접 실행 (Node.js 20+)

Docker 없이 Node.js로 직접 실행하는 경우:

```bash
npm install

# PostgreSQL만 Docker로 실행
docker compose up postgres -d

# 환경 변수 설정
cp .env.example .env
# DATABASE_URL 수정: @postgres → @localhost

npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed          # (선택) 테스트 데이터

npm run start:dev:prisma     # Prisma 모드
npm run start:dev            # in-memory 모드 (DB 불필요)
```

---

## 프로젝트 구조

```
back/
├── src/
│   ├── main.ts                 # 전역 ValidationPipe, Swagger 설정
│   ├── app.module.ts           # 루트 모듈
│   ├── common/
│   │   ├── data-source.ts      # DATA_SOURCE 스위칭 헬퍼
│   │   └── runtime-env.ts      # 환경 변수 읽기 + 프로덕션 검증
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
├── setup.sh                    # 최초 설정 스크립트 (clone 후 바로 실행)
├── Makefile                    # 자주 쓰는 명령어 단축키
├── Dockerfile                  # 멀티스테이지 빌드
├── docker-compose.yml          # 개발 환경 (postgres + back, 핫 리로드)
├── docker-compose.prod.yml     # 프로덕션 환경 (빌드 이미지 + migrate job)
└── .env.example                # 환경 변수 템플릿
```

---

## 저장소 패턴 (DATA_SOURCE 스위칭)

```
DATA_SOURCE=memory  →  InMemory*Repository  (DB 없이 즉시 동작)
DATA_SOURCE=prisma  →  Prisma*Repository    (PostgreSQL 연결 필요)
```

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

## API 엔드포인트

전체 목록은 Swagger UI(http://localhost:4000/api-docs)에서 확인하세요.

### 인증
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/auth/sign-in` | 로그인 |
| `POST` | `/auth/sign-out` | 로그아웃 |
| `GET` | `/auth/me` | 현재 사용자 |
| `POST` | `/auth/refresh` | access token 갱신 |

### 사용자
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/users/register` | 회원가입 |
| `GET` | `/users/me` | 내 정보 |
| `PATCH` | `/users/me` | 내 정보 수정 |

### 강좌 / 수강
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/courses` | 공개 강좌 목록 |
| `GET` | `/courses/:slug` | 강좌 상세 |
| `GET` | `/me/courses` | 내 수강 강좌 |
| `POST` | `/enrollments` | 수강 신청 |
| `GET` | `/me/enrollments` | 내 수강 목록 |
| `PATCH` | `/enrollments/:id` | 수강 상태 변경 |
| `DELETE` | `/enrollments/:id` | 수강 취소 |

### 출석
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/me/attendance/workspace` | 출석 워크스페이스 |
| `POST` | `/attendance/check-in` | 출석 체크 |

### 과제 (학생)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/me/assignments/workspace` | 내 과제 |
| `POST` | `/me/assignments/submissions` | 과제 제출 |
| `GET` | `/submissions/:id` | 제출 상세 |

### 과제 (강사)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/instructor/assignments/workspace` | 강사 과제 |
| `POST` | `/instructor/assignments` | 과제 생성 |
| `PATCH` | `/instructor/assignments/:id` | 과제 수정 |
| `PUT` | `/instructor/assignments/:id/template` | 템플릿 업서트 |
| `PATCH` | `/instructor/assignments/submissions/:id` | 제출 상태 변경 |
| `POST` | `/instructor/assignments/submissions/:id/feedback` | 피드백 추가 |
| `GET` | `/instructor/assignments/:id/timeline` | 타임라인 |

### 파일 / 관리자 / 기타
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/files/presign` | presign URL 발급 |
| `POST` | `/files/complete` | 업로드 완료 |
| `GET` | `/files/:id` | 파일 메타 |
| `GET` | `/admin/users/workspace` | 사용자 목록 |
| `GET` | `/admin/users/search` | 사용자 검색 |
| `POST` | `/admin/courses` | 수업 생성 |
| `DELETE` | `/admin/courses/:id` | 수업 삭제 |
| `GET` | `/admin/schedules/workspace` | 일정 목록 |
| `POST` | `/admin/schedules` | 일정 생성 |
| `GET` | `/admin/courses/:id/attendance-scope-workspace` | 출석 scope |
| `PUT` | `/admin/courses/:id/attendance-scopes` | 출석 scope 정책 |
| `GET` | `/healthz` | 헬스 체크 |

---

## Prisma 명령어

```bash
make migrate       # 마이그레이션 생성 (컨테이너 내부)
make seed          # seed 데이터 적재
make studio        # Prisma Studio (DB GUI)

# 직접 실행
npm run prisma:generate
npm run prisma:migrate        # dev (생성 + 적용)
npm run prisma:migrate:deploy # prod (적용만)
npm run prisma:seed
```

---

## 테스트

```bash
make test                     # in-memory 통합 테스트 (컨테이너)

npm test                      # 직접 실행 (in-memory)
npm run test:prisma           # Prisma 모드 (DB 실행 필요)
```

---

## 프로덕션 실행

```bash
cp .env.example .env
# .env 수정: AUTH_TOKEN_SECRET, OPENAI_API_KEY, CORS_ORIGIN, POSTGRES_PASSWORD

docker compose -f docker-compose.prod.yml --env-file .env up -d --build
```

---

## 개발 테스트 계정

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
| [`data_structure.md`](./data_structure.md) | 도메인 데이터 구조 |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 기여 가이드 |
