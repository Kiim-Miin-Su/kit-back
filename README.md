# AI Edu LMS — Backend

NestJS + Prisma 기반 AI 교육 LMS REST API 서버입니다.

---

## 시작하기

**사전 요구사항:** `./setup.sh`가 Docker와 `psql` 클라이언트 설치를 우선 시도합니다. 운영자는 macOS `Terminal` 또는 Windows `Git Bash`에서 그대로 실행하면 됩니다.

### 먼저 알아둘 점

완전히 아무것도 없는 새 PC에서 `git clone` 직후 100% 무설치 자동 실행까지는 아닙니다. 아래 항목은 사용자가 직접 준비하거나 최초 1회 승인해야 할 수 있습니다.

1. `Git` 또는 `Git Bash`
2. 인터넷 연결
3. Docker Desktop 최초 실행/권한 승인
4. 회사 보안 정책 때문에 `brew`, `winget` 자동 설치가 막힌 경우의 수동 설치
5. 백엔드에서 터미널 DB 접속까지 하려면 `psql` 클라이언트

### 최소 설치물

macOS:

1. `Git`
2. `Docker Desktop`
3. `psql` 클라이언트
4. `Homebrew`는 자동 설치를 쓰고 싶을 때만 필요

Windows:

1. `Git for Windows` (Git Bash 포함)
2. `Docker Desktop`
3. `PostgreSQL client` 또는 `psql`
4. `winget`은 자동 설치를 쓰고 싶을 때만 필요

`setup.sh`는 위 항목이 없으면 가능한 범위까지 자동 설치를 시도합니다. 다만 회사 PC 정책 때문에 `brew`나 `winget`이 막혀 있으면 수동 설치 후 다시 `./setup.sh`를 실행하면 됩니다.

### 자동 설치가 안 되는 경우 직접 설치해야 하는 것

macOS:

1. `Git`이 없어서 저장소 clone 자체를 못 하는 경우
2. `Homebrew`가 없고, 앱 설치를 CLI로 하고 싶지 않은 경우
3. Docker Desktop 첫 실행에서 macOS 보안 승인/로그인이 필요한 경우

Windows:

1. `Git Bash`가 없어서 `./setup.sh`를 실행할 셸이 없는 경우
2. `winget` 사용이 차단된 회사 PC
3. Docker Desktop 첫 실행에서 관리자 권한 또는 WSL 연동 승인이 필요한 경우
4. `psql` 클라이언트를 별도 설치해야 하는 경우

### 수동 설치 명령

macOS:

```bash
brew install git
brew install --cask docker
brew install postgresql@16
```

Windows PowerShell:

```powershell
winget install -e --id Git.Git
winget install -e --id Docker.DockerDesktop
winget install -e --id PostgreSQL.PostgreSQL.16
```

```bash
git clone <back-repo-url>
git clone <front-repo-url>   # 같은 부모 디렉터리에 함께 둡니다
cd back
./setup.sh
```

`back/setup.sh` 하나로 **back + front 전체 스택**을 기동합니다.  
`back/docker-compose.yml`에 front 서비스가 포함되어 있어, `docker compose down` 한 번으로 모두 정리됩니다.

```text
workspace/
├── back/   ← 여기서 setup.sh 실행
└── front/  ← docker-compose로 함께 기동
```

> **Windows 사용자:** Git Bash / WSL2 터미널에서 실행하세요.  
> PowerShell: `scripts/setup-dev.ps1` → `docker compose up -d`

### 운영자 빠른 실행

macOS:

1. `back`, `front` 저장소를 같은 부모 디렉터리에 둡니다.
2. `Terminal`에서 `cd back && ./setup.sh` 실행
3. 완료 메시지에 나온 `REST API`, `PostgreSQL`, 테스트 계정 확인

Windows:

1. `back`, `front` 저장소를 같은 부모 디렉터리에 둡니다.
2. `Git Bash`에서 `cd back && ./setup.sh` 실행
3. `winget` 사용이 가능한 PC면 Docker Desktop과 `psql` 설치를 자동 시도합니다.
4. 회사 정책으로 자동 설치가 막히면 README 하단 설치 명령을 수동 실행한 뒤 다시 `./setup.sh`

`setup.sh`가 자동으로 처리합니다:

1. Docker 설치 및 실행 여부 확인
2. `psql` 클라이언트 설치 여부 확인
3. `.env` 파일 자동 생성 (없을 경우 `.env.example` 기반으로 생성)
4. 포트 충돌 자동 해결:
   - **Docker 컨테이너**가 점유 중이면 해당 컨테이너를 강제 제거하고 기본 포트 사용
   - **다른 프로세스**가 점유 중이면 빈 포트를 자동으로 탐색해 사용
5. **back + front 전체 스택** 컨테이너 시작 (`docker compose up -d`)
6. 컨테이너 내부: `npm install` → `prisma generate` → `prisma migrate deploy` → 서버 시작
7. 서버 헬스체크 통과 대기 (최대 3분)
8. 개발용 테스트 seed 데이터 자동 적재
9. 프론트엔드 Next.js 준비 대기 (최대 3분)

첫 실행이 끝나면 다음 세 가지가 바로 가능해야 합니다.

1. 프론트엔드: `http://localhost:<FRONT_HOST_PORT>`
2. API 호출: `http://localhost:<HOST_PORT>`
3. 터미널 DB 접속: `psql -h localhost -p <POSTGRES_HOST_PORT> -U postgres -d ai_edu`

예시 출력:

```bash
REST API   → http://localhost:4001
Healthz    → http://localhost:4001/healthz
PostgreSQL → localhost:5433
psql -h localhost -p 5433 -U postgres -d ai_edu
```

기존 포트가 **Docker 컨테이너**에 의해 점유 중이면 해당 컨테이너를 강제 제거하고 기본 포트(`4000`, `5432`)를 그대로 사용합니다.  
**다른 프로세스**가 점유 중이면 `.env`의 `HOST_PORT`, `POSTGRES_HOST_PORT`를 다음 빈 포트로 자동 갱신합니다.

| 서비스 | 기본 주소 | 비고 |
|--------|-----------|------|
| **프론트엔드** | **http://localhost:3000** | `FRONT_HOST_PORT` 변수에 따라 바뀜 |
| REST API | http://localhost:4000 | `HOST_PORT` 변수에 따라 바뀜 |
| **Swagger UI** | **http://localhost:4000/api-docs** | 포트는 HOST_PORT와 동일 |
| **Adminer (웹 DB GUI)** | **http://localhost:8080** | `ADMINER_PORT` 변수에 따라 바뀜 |
| **Prisma Studio (웹 DB GUI)** | **http://localhost:5555** | `up -d` 시 자동 기동 (back healthy 후) |
| 헬스 체크 | http://localhost:4000/healthz | |
| PostgreSQL | localhost:5432 (터미널 전용) | 브라우저 접속 불가 — DB GUI는 Adminer/Prisma Studio 사용 |

> **실제 포트 확인:** `setup.sh` 완료 메시지에 출력된 주소를 사용하거나, `cat .env | grep HOST_PORT`로 확인하세요.
>
> **DB 접속 방법:** 비밀번호 없음 (개발 환경 `trust` 인증)
> ```bash
> make psql          # .env의 POSTGRES_HOST_PORT를 자동으로 읽어 접속
> # 또는
> psql -h localhost -p $(grep POSTGRES_HOST_PORT .env | cut -d= -f2) -U postgres -d ai_edu
> ```

```bash
./setup.sh --no-seed    # seed 없이 실행
./setup.sh --no-install # Docker 자동 설치 비활성화
./setup.sh --no-front   # back만 실행
```

---

## Swagger UI 사용법

서버 실행 후 http://localhost:4000/api-docs 에서 모든 API를 테스트할 수 있습니다.

**인증이 필요한 엔드포인트 사용 방법:**

1. `POST /auth/sign-in` 실행 → 응답의 `accessToken` 복사
2. 우측 상단 **Authorize** 버튼 클릭
3. `access-token` 입력란에 복사한 토큰 붙여넣기 → **Authorize**
4. 이제 `🔒` 아이콘이 붙은 엔드포인트 모두 테스트 가능

**테스트 계정:**

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 학생 | `student-demo-01@koreait.academy` | `password123` |
| 강사 | `instructor-dev-01@koreait.academy` | `password123` |
| 관리자 | `admin-root@koreait.academy` | `password123` |

---

## 이후 실행

```bash
make dev          # 서버 재시작 (back + front 전체)
make logs         # back 로그 스트리밍
make logs-front   # front 로그 스트리밍
make stop         # 전체 중지 (back + front + db 포함)
make clean        # 전체 컨테이너 + 볼륨 삭제 (DB 초기화)
make psql         # 호스트 터미널에서 PostgreSQL 접속
```

전체 명령어: `make help`

문제가 있으면 먼저 아래 순서로 확인하세요.

```bash
docker compose ps
make logs
curl http://localhost:4000/healthz
make psql
```

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
| `HOST_PORT` | `4000` | 호스트에 노출할 백엔드 포트 |
| `PORT` | `4000` | 서버 포트 |
| `POSTGRES_HOST_PORT` | `5432` | 호스트에 노출할 PostgreSQL 포트 |
| `FRONT_HOST_PORT` | `3000` | 호스트에 노출할 프론트엔드 포트 |
| `DATA_SOURCE` | `prisma` | `memory` \| `prisma` |
| `DATABASE_URL` | `postgresql://postgres@postgres:5432/ai_edu` | PostgreSQL 연결 URL |
| `CORS_ORIGIN` | `http://localhost:3000` | 허용할 프론트엔드 origin |
| `AUTH_TOKEN_SECRET` | _(코드 기본값 사용)_ | HMAC 서명 시크릿 (프로덕션 필수) |
| `OPENAI_API_KEY` | _(비어있음)_ | OpenAI API 키 |
| `NEXT_PUBLIC_DEV_ROLE_BYPASS` | `false` | 개발용 역할 우회 (front 환경 변수) |

---

## DB 직접 접속

앱 컨테이너는 내부적으로 `postgres:5432`에 붙고, 개발자는 호스트에서 `localhost:${POSTGRES_HOST_PORT}`로 붙습니다.

```bash
make psql    # .env의 POSTGRES_HOST_PORT를 자동으로 읽어 접속 (권장)

# 또는 직접 실행 (.env에서 포트 확인 후)
# grep POSTGRES_HOST_PORT .env  → 실제 포트 확인
psql -h localhost -p <POSTGRES_HOST_PORT> -U postgres -d ai_edu
```

> **비밀번호 없음** — 개발 환경은 `trust` 인증이라 비밀번호를 묻지 않습니다.  
> **실제 포트 확인** — `setup.sh`가 5432가 이미 사용 중이면 5433 등으로 자동 변경합니다.  
> `cat .env | grep POSTGRES_HOST_PORT` 로 현재 할당된 포트를 확인하세요.

운영자가 주로 확인하는 값:

| 항목 | 기본값 | 확인 방법 |
|------|--------|-----------|
| API 포트 | `4000` | `.env`의 `HOST_PORT` |
| DB 포트 | `5432` | `.env`의 `POSTGRES_HOST_PORT` |
| DB 이름 | `ai_edu` | `docker compose.yml` |
| DB 사용자 | `postgres` | `docker compose.yml` |

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
│   ├── main.ts                 # 전역 ValidationPipe, CORS 설정
│   ├── app.module.ts           # 루트 모듈
│   ├── common/
│   │   ├── data-source.ts      # DATA_SOURCE 스위칭 헬퍼
│   │   └── runtime-env.ts      # 환경 변수 읽기 + 프로덕션 검증
│   ├── auth/                   # HMAC 토큰 + refresh cookie 인증
│   ├── ai/                     # AI 연동 서비스
│   ├── analytics/              # 학습/운영 분석 집계
│   ├── users/                  # 회원가입, 내 정보
│   ├── courses/                # 강좌 카탈로그, 감사로그
│   ├── curriculums/            # 커리큘럼 조회/구성
│   ├── enrollments/            # 수강 신청/관리
│   ├── attendance/             # 출석 체크, 워크스페이스
│   ├── assignments/            # 과제/제출/리뷰/피드백
│   ├── admin/                  # 관리자 사용자·수업·일정·출석 scope
│   ├── files/                  # 로컬 업로드 URL, 파일 메타
│   ├── health/                 # GET /healthz
│   ├── notifications/          # 알림 생성/조회
│   ├── progress/               # 진도 데이터
│   ├── quizzes/                # 퀴즈 도메인
│   ├── prisma/                 # PrismaService, PrismaModule
│   └── mock-data/              # 메모리 저장소 초기 데이터
├── prisma/
│   ├── schema.prisma           # DB 스키마
│   ├── seed.ts                 # 개발용 seed 데이터
│   └── migrations/             # Prisma 마이그레이션 이력
├── scripts/                    # 환경 설정/실행 보조 스크립트
├── progress/                   # 작업 기록/진행 메모
├── test/                       # 통합 테스트 (Node test runner)
├── setup.sh                    # 최초 설정 스크립트 (clone 후 바로 실행)
├── Makefile                    # 자주 쓰는 명령어 단축키
├── Dockerfile                  # 멀티스테이지 빌드
├── docker-compose.yml          # 개발 환경 (postgres + back, 핫 리로드)
├── docker-compose.prod.yml     # 프로덕션 환경 (빌드 이미지 + migrate job)
└── .env.example                # 환경 변수 템플릿
```

### 폴더별 역할 요약

| 경로 | 역할 |
|------|------|
| `src/auth` | 로그인, 토큰, 가드, 현재 사용자 해석 |
| `src/users` | 회원가입과 내 정보 |
| `src/courses` | 강좌 카탈로그와 운영용 감사 조회 |
| `src/curriculums` | 커리큘럼 데이터 제공 |
| `src/enrollments` | 수강 신청/취소/워크스페이스 조회 |
| `src/attendance` | 출석 체크와 출석 범위 처리 |
| `src/assignments` | 과제, 제출, 피드백, 타임라인 |
| `src/admin` | 관리자 운영 API |
| `src/files` | 로컬 mock 업로드 URL과 파일 메타 처리 |
| `src/analytics` | 대시보드용 분석 데이터 |
| `src/notifications` | 사용자 알림 데이터 |
| `src/progress` | 학습 진도 데이터 |
| `src/quizzes` | 퀴즈 관련 API |
| `src/ai` | AI 기능 연동 |
| `src/prisma` | Prisma 모듈과 DB 연결 |
| `src/mock-data` | memory 모드 기본 데이터 |
| `prisma` | 스키마, 마이그레이션, 시드 |
| `scripts` | 개발 환경 스크립트 |
| `progress` | 작업 메모/히스토리 |
| `test` | 백엔드 테스트 |

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

현재 엔드포인트 문서는 README와 테스트 케이스를 기준으로 유지합니다.

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
| `GET` | `/me/assignments/workspace` | 내 과제 (`Authorization: Bearer ...` 필요) |
| `POST` | `/me/assignments/submissions` | 현재 로그인 사용자 기준 과제 제출 |
| `GET` | `/submissions/:id` | 제출 상세 (`학생은 본인 제출만`) |

### 과제 (강사)
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `GET` | `/instructor/assignments/workspace` | 강사/조교/관리자 과제 |
| `POST` | `/instructor/assignments` | 과제 생성 |
| `PATCH` | `/instructor/assignments/:id` | 과제 수정 |
| `PUT` | `/instructor/assignments/:id/template` | 템플릿 업서트 |
| `PATCH` | `/instructor/assignments/submissions/:id` | 제출 상태 변경 |
| `POST` | `/instructor/assignments/submissions/:id/feedback` | 피드백 추가 |
| `GET` | `/instructor/assignments/:id/timeline` | 타임라인 |

### 파일 / 관리자 / 기타
| 메서드 | 경로 | 설명 |
|--------|------|------|
| `POST` | `/files/presign` | 현재 로그인 사용자 소유 파일 presign |
| `POST` | `/files/complete` | 본인 파일 업로드 완료 |
| `GET` | `/files/:id` | 본인 파일 메타 |
| `GET` | `/admin/users/workspace` | 관리자 사용자 목록 |
| `GET` | `/admin/users/search` | 관리자 사용자 검색 |
| `POST` | `/admin/courses` | 관리자 수업 생성 |
| `DELETE` | `/admin/courses/:id` | 관리자 수업 삭제 |
| `GET` | `/admin/schedules/workspace` | 관리자 일정 목록 |
| `POST` | `/admin/schedules` | 관리자 일정 생성 |
| `GET` | `/admin/courses/:id/attendance-scope-workspace` | 관리자 출석 scope |
| `PUT` | `/admin/courses/:id/attendance-scopes` | 관리자 출석 scope 정책 |
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
| [`EXTENSION_GUIDE.md`](./EXTENSION_GUIDE.md) | 확장 전략, `.env`, 배포, CORS, 권한 주의사항 |
| [`PRODUCTION_CHECKLIST.md`](./PRODUCTION_CHECKLIST.md) | 운영 배포 전후 점검 체크리스트 |
| [`progress/INFO.md`](./progress/INFO.md) | 아키텍처 기준 및 후속 구현 우선순위 |
| [`progress/progress_03.md`](./progress/progress_03.md) | 최신 진행 상황 (2026-04-13) |
| [`progress/FRONT_HANDOFF_2026-04-09.md`](./progress/FRONT_HANDOFF_2026-04-09.md) | 프론트엔드 연동 계약 상세 |
| [`data_structure.md`](./data_structure.md) | 도메인 데이터 구조 |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | 기여 가이드 |
