# Optimization / Hardening Requirements

## Scope
- 대상:
  - `front`
  - `back`
  - PostgreSQL + Prisma
  - AWS 배포 가능 구조
- 목표:
  - 로컬 in-memory 기반 MVP를 AWS 운영 가능한 구조로 점진 전환
  - 재사용성, 확장성, 보안, 문서화 우선
  - 나중에 DB/스토리지/인증 구현체를 교체해도 서비스 레이어 계약은 유지

## Requirements

### Security
1. `.gitignore`, `.dockerignore`, `.npmignore` 점검
2. 비밀정보는 코드/문서/샘플 응답에 하드코딩 금지
3. `.env.example`은 placeholder만 유지, 실제 secret은 AWS Secrets Manager 또는 SSM Parameter Store로 이동
4. 인증 구조 강화
5. DTO 검증, 역할 분리, controller/service/repository 책임 분리
6. refresh session 회전, 재사용 감지, 이전 refresh token 무효화
7. cookie 옵션 명시
8. CSRF, CORS, brute-force, replay attack 대응
9. presigned upload/download 권한 검증 강화
10. 관리자/강사/학생 권한 체크를 endpoint 단위가 아니라 policy 단위로 재정의
11. 감사로그는 보안 이벤트 기준으로 확장
12. PII 최소 저장 원칙 적용

### Security Details
1. cookie 정책
- `HttpOnly`, `Secure`, `SameSite`, `Path`, `Max-Age` 명시
- 운영/로컬 환경별 분기 문서화

2. token 정책
- access token TTL 단기 유지
- refresh token은 DB 세션 테이블로 추적
- 기기/브라우저 fingerprint는 선택 항목으로 검토
- logout 시 현재 세션만 폐기할지 전체 세션 폐기할지 정책 명시

3. 계정 보호
- 로그인 실패 rate limit
- IP / user key 기반 throttling
- password 정책, lockout 정책, suspicious login 로그
- 2FA는 현재 필수 구현은 아니지만 확장 포인트를 auth service 계약에 반영

4. 파일 보안
- `ownerId`, `actorId`, `resourceScope` 검증
- 업로드 완료 전 파일은 attachment 연결 금지
- content-type spoofing, size limit, checksum 검증
- S3 object key 규칙 표준화

### Architecture / Optimization
1. 구조화
- 책임 분리
- 컴포넌트화
- 변수화
- 함수화
- 반복 제거

2. repository 계약 재설계
- 현재 동기식 `read()/write()` snapshot repository를 async 도메인 메서드 기반 계약으로 교체
- `InMemory*Repository`와 `Prisma*Repository`가 같은 인터페이스를 구현하도록 정리
- provider switch는 `DATA_SOURCE=memory|prisma`

3. 모듈 경계 강화
- auth
- users
- courses
- enrollments
- attendance
- assignments
- files
- admin
- 각 모듈은 DTO / service / repository / types / policy / tests를 기본 단위로 유지

4. 성능 최적화 원칙
- 반복 계산/중복 transform 최소화
- 대용량 배열 복제 최소화
- 필요 없는 메모리 snapshot 제거
- pagination, filtering, sorting은 DB로 이동
- N+1 query 방지
- hot path에서 불필요한 JSON serialization 최소화

5. 캐시 전략
- 초기에 무조건 캐시를 넣지 않는다
- 읽기 많은 public catalog, workspace summary부터 검토
- 캐시 대상/TTL/무효화 규칙 문서화

### Stability / Test
1. 테스트 코드 추가
2. 유효한 mock-data / seed-data 유지
3. dependency, package 유효성 체크
4. timeout, null, race condition, partial failure 대응
5. 운영자 변경에도 흔들리지 않는 로그/감사 체계
6. 높은 확장성

### Test Strategy
1. 단위 테스트
- service validation
- policy / permission
- error code mapping

2. 통합 테스트
- auth -> users -> enrollments -> attendance
- assignments -> files -> audit
- admin CRUD
- Prisma mode / memory mode 둘 다 검증

3. 계약 테스트
- 프론트가 기대하는 response shape 고정
- 에러코드 / 상태코드 회귀 방지

4. 장애 테스트
- DB unavailable
- S3 presign 실패
- timeout
- duplicate request
- stale refresh token

### Observability / Operations
1. 구조화 로그
- request id
- user id
- role
- course id
- submission id
- file id
- error code

2. metrics
- auth failure rate
- API latency
- DB query latency
- upload success/failure rate
- attendance check-in failure rate

3. tracing
- request -> service -> repository -> external dependency 흐름 추적

4. health / readiness
- `/healthz` 외에 DB / storage / queue readiness 필요

5. audit
- 관리자 변경
- 권한 변경
- 로그인/로그아웃/refresh 이상행동
- 파일 업로드 완료/실패

### AWS Deployment Assumptions
1. 기본 방향
- compute: ECS Fargate 또는 App Runner 우선 검토
- database: RDS PostgreSQL
- object storage: S3
- secret: AWS Secrets Manager 또는 SSM Parameter Store
- CDN: CloudFront
- DNS / TLS: Route 53 + ACM
- log: CloudWatch Logs

2. 비동기 작업이 생기면
- queue: SQS
- worker: ECS Fargate worker
- video transcoding은 AWS Elemental MediaConvert 검토

3. 네트워크
- private subnet에 DB 배치
- app -> DB 최소 권한
- security group ingress 최소화

4. 배포
- blue/green 또는 rolling deploy
- migration 선행/후행 순서 문서화
- image tag는 immutable 기준

### Database / Prisma
1. PostgreSQL 기준 확정
2. Prisma schema는 현재 REST 계약 기준 유지
3. migration 정책
- destructive migration은 수동 승인
- seed는 dev 전용과 staging/demo 전용 분리

4. transaction 기준
- submission revision 생성
- feedback + attachment 연결
- enrollment 상태 변경
- refresh session 회전

5. index / query plan 점검
- public course search
- my courses
- attendance workspace
- submission timeline
- audit log list

### API / Compatibility
1. 프론트 계약 우선
2. 응답 필드 rename / remove는 문서와 함께 버전 관리
3. 에러코드 표준화
4. id 전략 통일
- 외부 공개 ID
- 내부 DB PK

### Documentation
1. README는 실행 방법과 현재 상태만 유지
2. INFO 문서는 아키텍처 기준 문서로 유지
3. data_structure 문서는 Prisma/DB 전환 기준 문서로 유지
4. 운영 runbook 필요
5. 장애 대응 checklist 필요
6. AWS 배포 문서 필요

## Missing Items Added By Codex
1. AWS target architecture와 서비스 선택 기준
2. secret / cookie / token / session 회전 정책
3. observability, tracing, metrics
4. migration / rollout / rollback 원칙
5. Prisma 전환의 실제 선행 과제
6. S3 presign 및 파일 권한 검증 기준
7. health/readiness와 장애 대응 범위
8. 계약 테스트와 운영 runbook 필요성

## Plan Constraints
1. 지금 당장 최적화보다 우선인 것
- repository 계약 비동기화
- Prisma provider switch
- auth/files/admin hardening

2. 지금 하지 않을 것
- 조기 microservice 분리
- 무분별한 caching
- 과도한 premature optimization

3. 성공 기준
- memory/prisma 모드 모두 동일 API 계약 유지
- AWS 배포 전환 시 코드 수정 범위를 repository / infra adapter 수준으로 제한
- 보안/로그/테스트 기준이 문서와 코드에 동시에 반영
