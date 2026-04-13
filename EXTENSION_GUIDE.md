# Backend Extension Guide

이 문서는 `back/` 기준으로 기능 확장, 환경 변수 추가, 배포 설정 변경 시 반드시 같이 확인해야 할 항목을 정리한다.

---

## 1. 확장 기본 원칙

- 새 기능은 `src/<domain>/` 단위로 모듈을 분리한다.
- 보호된 API는 기본적으로 `AuthGuard`를 붙이고, 역할 제약이 있으면 `RolesGuard` + `@Roles(...)`를 같이 둔다.
- 요청 바디의 `userId`, `role`, `ownerId` 같은 식별자는 신뢰하지 않는다.
- 현재 로그인 사용자 기준으로 서버에서 다시 결정한다.
- `memory`와 `prisma` 구현체가 둘 다 있는 도메인은 동작 계약을 같이 맞춘다.

---

## 2. 새 API/도메인 추가 체크리스트

1. `src/<domain>/` 아래에 `module`, `controller`, `service`, `repository`, `dto`를 만든다.
2. `AppModule`에 모듈을 등록한다.
3. 인증이 필요한 엔드포인트는 가드를 컨트롤러 레벨에 우선 적용한다.
4. 관리자/강사 전용 기능이면 역할 제약을 클래스 레벨에 먼저 둔다.
5. `.env.example`, `README.md`, `docker-compose.prod.yml`에 필요한 환경 변수를 반영한다.
6. 최소 1개 이상 테스트를 추가한다.

---

## 3. 인증/권한 확장 시 주의점

현재 구조:

- access token: `Authorization: Bearer ...`
- refresh token: `ai_edu_refresh_token` httpOnly cookie
- 역할 검증: 백엔드 가드가 최종 책임

주의점:

- 프론트 쿠키나 로컬스토리지의 역할 값은 UX용이다. 백엔드는 절대 그것만 믿으면 안 된다.
- 학생 전용 `me/*` API는 요청 바디나 쿼리의 사용자 식별자를 그대로 쓰지 말고 `@CurrentUser()` 기준으로 처리한다.
- 파일 업로드처럼 `ownerId`가 포함된 요청은 서버에서 현재 사용자 ID로 덮어쓰는 쪽이 안전하다.
- 학생 본인 데이터 조회와 강사/관리자 조회 범위가 다르면 서비스 레벨에서 한 번 더 권한 분기를 둔다.

---

## 4. 환경 변수 추가 시 순서

새 환경 변수를 추가할 때는 아래 파일을 같이 본다.

- `.env.example`
- `src/common/runtime-env.ts`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `Dockerfile` 또는 런타임 스크립트
- `README.md`

분류 기준:

- 서버 내부 전용 비밀값: `NEXT_PUBLIC_` 같은 공개 접두사 없이 유지
- 프로덕션 필수값: `runtime-env.ts`에서 명시적으로 검증
- 선택값: 기본값을 코드에 두되 README에 용도 기록

추천 규칙:

- 시크릿은 개발 기본값이 있더라도 프로덕션에서는 반드시 강제한다.
- 값이 늘어날수록 `runtime-env.ts`에 읽기 함수로 모아둔다.
- 컨트롤러/서비스에서 `process.env`를 직접 읽는 패턴은 늘리지 않는다.

---

## 5. CORS / Cookie / Origin 주의점

현재 서버는 `enableCors({ origin, credentials: true })` 구조다.

확장 시 주의:

- 프론트가 쿠키 기반 refresh를 쓰므로 `credentials: true`를 유지해야 한다.
- `CORS_ORIGIN`은 정확한 프론트 주소로 넣는다.
- 운영에서 프론트/백 도메인이 달라지면 `http`/`https`, 포트, 서브도메인까지 정확히 맞춰야 한다.
- 다중 origin이 필요하면 `runtime-env.ts`에서 안전하게 파싱해서 배열/함수 기반으로 확장한다.
- `SameSite=Lax` 정책이 요구사항과 맞는지 배포 형태별로 다시 본다.
- HTTPS 운영에서는 `secure: true`가 걸리므로 TLS 종료 위치를 명확히 해야 한다.

---

## 6. Docker / 배포 파일 수정 시 주의점

수정 대상:

- `Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `Makefile`
- `setup.sh`

확인 항목:

- 빌드 스테이지와 런타임 스테이지가 같은 의존성을 기대하는지
- Prisma migration job과 runtime 컨테이너의 환경 변수가 일치하는지
- healthcheck 경로가 실제 엔드포인트와 맞는지
- 포트/환경 변수 이름이 README와 일치하는지

특히 조심할 점:

- 프로덕션 compose에 변수를 추가했으면 `.env.example`과 README도 같이 바꾼다.
- migration 컨테이너와 runtime 컨테이너 중 한쪽만 값을 갖는 실수를 자주 한다.
- 헬스체크 경로를 바꾸면 `setup.sh` 대기 로직도 같이 봐야 한다.

---

## 7. Prisma 확장 시 주의점

- 스키마 변경 후 `migration.sql`만 맞추지 말고 seed 데이터와 repository 응답 형태도 같이 맞춘다.
- `memory` 구현체가 있는 도메인은 Prisma 쪽만 바꾸면 프론트 fallback과 테스트가 어긋날 수 있다.
- Prisma 전용 기능을 넣으면 `DATA_SOURCE=memory`에서 어떻게 동작할지 먼저 결정한다.

추천 순서:

1. `schema.prisma` 수정
2. migration 생성/적용
3. seed 보정
4. Prisma repository 보정
5. in-memory repository 보정
6. 테스트 추가

---

## 8. 테스트 확장 기준

현재 테스트는 크게 두 층으로 본다.

- 도메인 흐름 테스트: 컨트롤러/서비스 조합 검증
- HTTP 권한 테스트: 실제 라우트 기준 인증/인가 검증

새 보호 API를 만들면 최소한 아래 둘 중 하나는 추가한다.

- 역할별 허용/차단 테스트
- 현재 사용자 기준 식별자 강제 테스트

권장:

- 401/403/404 케이스를 함께 추가
- 문서에 적은 엔드포인트와 테스트 이름을 최대한 맞춘다

---

## 9. 운영 확장 시 자주 놓치는 항목

- OpenAI, 외부 스토리지, 메일러 같은 외부 연동 키를 `.env.example`에만 추가하고 compose/runtime 검증을 빼먹는 경우
- 학생/강사 권한을 프론트에서만 막고 백엔드 가드를 빠뜨리는 경우
- 새 파일 업로드 플로우에서 파일 소유자 검증을 누락하는 경우
- mock/in-memory 경로는 동작하는데 Prisma 경로는 빠진 경우
- README에는 기능이 있다고 적혀 있지만 실제 healthcheck, route, env 설정이 안 맞는 경우

---

## 10. 확장 전에 권장하는 확인 순서

1. 이 기능이 공개 API인지 보호 API인지 먼저 정한다.
2. 필요한 환경 변수가 공개값인지 비밀값인지 나눈다.
3. `memory`와 `prisma`에서 둘 다 지원할지 결정한다.
4. Docker/배포 파일에 어떤 값이 추가되는지 먼저 적는다.
5. 테스트를 한 개라도 먼저 만든다.
6. README와 이 문서를 같이 갱신한다.
