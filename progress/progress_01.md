# Progress 01 (2026-04-11)

## 목적
- 백엔드 우선순위 기준 다음 단계인 파일 업로드 API(P0)를 구현한다.
- `interface -> in-memory` 구조를 유지해 추후 Prisma 저장소로 교체 가능한 형태를 유지한다.

## 이번 턴 구현 내용
1. 파일 업로드 API 구현
- `POST /files/presign`
- `POST /files/complete`
- `GET /files/:fileId`

2. 저장소 분리 구조 적용
- `src/files/files.repository.ts`
  - `FilesRepository` 인터페이스 정의
- `src/files/in-memory-files.repository.ts`
  - 인메모리 저장소 구현
- `src/files/files.service.ts`
  - 비즈니스 검증 및 상태 전이 구현

3. 검증 규칙 반영
- MIME allowlist 검증 (`UNSUPPORTED_MIME_TYPE`)
- 최대 용량 검증 (`FILE_SIZE_LIMIT_EXCEEDED`)
- checksum 포맷 검증 (`INVALID_CHECKSUM_FORMAT`)
- 완료 시 checksum/size 일치 검증
  - `CHECKSUM_MISMATCH`
  - `FILE_SIZE_MISMATCH`

4. 모듈 연결
- `src/files/files.module.ts` 신설
- `src/app.module.ts`에 `FilesModule` 추가

## 응답/상태 모델
1. presign
- `fileId`, `ownerId`, `bucketKey`, `contentType`, `size`, `checksum`, `status(PENDING)`, `uploadUrl`, `createdAt`

2. complete
- `fileId`, `status(COMPLETED)`, `completedAt`, `downloadUrl`

3. get file metadata
- `fileId`, `ownerId`, `fileName`, `bucketKey`, `contentType`, `size`, `checksum`, `status`, `createdAt`, `completedAt`, `downloadUrl`

## 생성/수정 파일
- `src/files/files.types.ts`
- `src/files/files.repository.ts`
- `src/files/in-memory-files.repository.ts`
- `src/files/files.service.ts`
- `src/files/files.controller.ts`
- `src/files/files.module.ts`
- `src/files/dto/presign-file.dto.ts`
- `src/files/dto/complete-file-upload.dto.ts`
- `src/app.module.ts`

## 검증
- `npm run build` 통과

## 다음 단계 제안
1. 파일 업로드 메타를 제출 도메인(attachments)과 연결
2. presign/complete 흐름에 owner 권한 검증 추가
3. P1 강의 영상 업로드 API(`upload-init`, `upload-part`, `upload-complete`) 구현

---

## 추가 진행 (2026-04-11)
요청사항: 회원정보 검증 포함 전체 mock-data를 프론트 기준으로 통일.

1. 공통 seed 파일 신설
- `src/mock-data/front-aligned.mock.ts`
- admin / assignments / files 모듈이 동일 seed를 공유하도록 정리

2. 관리자 도메인 mock-data 통일
- `src/admin/admin.service.ts`
  - 사용자/수업/멤버/일정/감사로그 seed를 공통 파일로 교체
  - 회원검색 규칙을 프론트 기대값에 맞게 정리:
    - userId exact/prefix
    - userName contains
    - birthDate exact/contains
- 학생/강사/조교 계정과 생년월일 포함 데이터 확장

3. 제출 도메인 mock-data 통일
- `src/assignments/in-memory-assignments.repository.ts`
  - 프론트 mock 기준 과제/제출/리뷰/타임라인/영상 seed로 교체
  - courseId/assignmentId/submissionId를 프론트와 동일하게 정렬

4. 파일 도메인 mock-data 통일
- `src/files/in-memory-files.repository.ts`
  - 공통 seed 기반 초기 파일 레코드 로드 추가
  - 완료/대기 상태 mock 레코드 포함

5. 검증
- `npm run build` 통과

---

## 추가 진행 (2026-04-11, 통합 테스트 강화)
요청사항: front -> back 흐름을 철저히 검증하는 테스트 코드 작성.

1. 테스트 하네스 전환
- 샌드박스 환경에서 포트 listen(`EPERM`)이 금지되어 HTTP 소켓 기반 e2e(`supertest` + listen)는 불가.
- 대신 Nest `TestingModule` 기반 컨트롤러 통합 테스트 + DTO(`class-validator`) 검증 조합으로 전환.

2. 테스트 시나리오 확장
- `test/front-back-flow.test.js` 4개 시나리오 구성:
  - 관리자 회원검증/멤버배치 흐름
  - 과제 제출/리뷰/피드백/감사로그 흐름
  - 파일 presign/complete/조회 + 예외 흐름
  - 관리자 수업/출석 scope/일정 CRUD 흐름
- 정상/예외 케이스를 함께 검증:
  - `NOT_ENROLLED_COURSE`, `INVALID_SUBMISSION`
  - `FILE_UPLOAD_ALREADY_COMPLETED`, `CHECKSUM_MISMATCH`, `UNSUPPORTED_MIME_TYPE`, `FILE_NOT_FOUND`
  - `USER_NOT_FOUND`, `COURSE_NOT_FOUND`

3. 검증 결과
- `npm test` 통과 (`4 passed`)

4. 문서 점검
- 백엔드 문서(`progress/requirements.md`, `progress/INFO.md`, `progress/progress_01.md`)와
  프론트 문서(`../front/progress/requirements.md`, `../front/progress/INFO.md`) 간 API 기준을 재확인.
- 현재 백엔드 구현 범위와 mock-data 기준이 문서화된 프론트 계약과 일치함을 확인.

---

## 현재 상태 요약 (2026-04-11)

### 1) 구현 완료 기능
- 제출/리뷰 P0 API 구현
  - `GET /me/assignments/workspace`
  - `POST /me/assignments/submissions`
  - `GET /instructor/assignments/workspace`
  - `PATCH /instructor/assignments/submissions/:submissionId`
  - `POST /instructor/assignments/submissions/:submissionId/feedback`
  - `GET /submissions/:submissionId`
  - `GET /instructor/assignments/:assignmentId/timeline`
- 관리자 운영 API 구현
  - 사용자 검색/검증, 수업/멤버 관리, 일정 CRUD, 출석 scope 정책, 감사로그 조회
- 파일 업로드 P0 API 구현
  - `POST /files/presign`
  - `POST /files/complete`
  - `GET /files/:fileId`
- attachments <-> files 참조 연결(제출/피드백)
  - 제출/피드백 첨부 `attachment.id`가 `file-*` 패턴이면 파일 저장소 레코드와 연결 검증
  - 연결 성공 시 첨부 메타를 파일 레코드 기준으로 정규화 (`fileName`, `mimeType`, `sizeBytes`)
  - 연결 검증 에러코드 추가:
    - `ATTACHMENT_FILE_NOT_FOUND`
    - `ATTACHMENT_FILE_FORBIDDEN`
    - `ATTACHMENT_FILE_NOT_READY`
- front-aligned mock-data 통일
  - `admin / assignments / files` seed를 `src/mock-data/front-aligned.mock.ts`로 일원화
- 실행/검증 기반 정리
  - `../docker-compose.yml`로 front/back 동시 실행 구성
  - `npm test` 기준 front->back 흐름 통합 테스트 4개 시나리오 통과
  - attachments 연결 회귀 케이스(정규화/미존재/타인소유/pending) 포함

### 2) 남은 기능
- `files presign/complete` owner 권한 검증 및 접근 제어
- 강의 영상 업로드 API (`upload-init`, `upload-part`, `upload-complete`)
- 플레이어 토큰 발급 및 진도/학습분석 API
- in-memory 저장소를 Prisma 기반 저장소로 교체
- 프론트 서비스 레벨에서 실제 HTTP 기반 end-to-end 검증 파이프라인(로컬/CI) 추가

### 3) 고도화 계획
1. 단기(다음 스프린트)
- 파일 owner 검증, 재시도/중복완료 정책 정리
- attachments 연결 방식을 프론트 업로드 UX와 일치하도록 명시화
  - 프론트에서 파일 선택 후 `presign -> complete -> submission` 순서로 `attachment.id=fileId` 전달하도록 계약 확정
- 오류 코드 사전(API 계약 문서) 고정 및 프론트 매핑표 동기화

2. 중기(P1 구현)
- 영상 업로드 멀티파트 흐름 및 상태 전이 모델 도입
- 제출/리뷰/파일/영상 이벤트를 감사로그와 단일 이벤트 규약으로 통합
- Prisma Repository 병행 도입 후 provider 스위칭

3. 장기(운영 안정화)
- HTTP 레벨 통합 테스트(실서버) + 회귀 테스트 자동화
- 관측성(요청/도메인 이벤트 로그, 에러 추적) 강화
- 권한/인증 모델 고도화(역할별 접근 경계, course 단위 정책)

### 4) 실행 우선순위/일정 (안)
기준: 백엔드 1인 기준 full-time 가정.

| Priority | 작업 | 예상 작업량 | 목표 일정(안) | 완료 기준 |
| --- | --- | --- | --- | --- |
| P0 | attachments <-> files 참조 연결 | 완료 | 2026-04-11 | 제출/피드백 첨부 `fileId` 연결 검증 + 메타 정규화 적용 |
| P0 | files owner 권한 검증/접근제어 | 1.5일 | 2026-04-14 ~ 2026-04-15 | 타인 fileId 접근 차단, 에러코드 고정 |
| P0 | 오류 코드/계약 문서 고정 | 0.5일 | 2026-04-15 | 프론트 매핑표와 백엔드 에러코드 1:1 합의 |
| P1 | 영상 업로드 API (`upload-init/part/complete`) | 3일 | 2026-04-16 ~ 2026-04-18 | 멀티파트 업로드 흐름/상태전이/검증 완료 |
| P1 | 이벤트 규약 통합(제출/리뷰/파일/영상) | 1일 | 2026-04-18 | 감사로그 이벤트 스키마 단일화 |
| P1 | Prisma Repository 병행 도입 | 3일 | 2026-04-20 ~ 2026-04-22 | in-memory/prisma provider 스위칭 가능 |
| P2 | HTTP 실서버 통합 테스트 파이프라인 | 2일 | 2026-04-23 ~ 2026-04-24 | 로컬/CI에서 front->back e2e 자동 실행 |
| P2 | 관측성/권한 모델 고도화 | 2일 | 2026-04-24 ~ 2026-04-25 | 요청로그/에러추적/역할 경계 정책 반영 |

---

## 추가 진행 (2026-04-11, 배포 세팅 + DB 계획 문서)
1. 배포 파일 정리
- `../docker-compose.prod.yml` 추가 (front/back 프로덕션 빌드/실행, 헬스체크 포함)
- `../.env.prod.example` 추가 (배포용 환경변수 템플릿)
- `../DEPLOYMENT.md` 추가 (배포 절차 문서)
- `../front/Dockerfile`, `../front/.dockerignore` 추가
- `./Dockerfile`, `./.dockerignore` 추가

2. 런타임 점검 항목
- `GET /healthz` 엔드포인트 추가 (`src/health/*`)
- compose 문법 검증:
  - `docker compose --env-file ../.env.prod.example -f ../docker-compose.prod.yml config` 통과
- 프론트 프로덕션 빌드 검증:
  - `npm -C ../front run build` 통과

3. DB 구현 계획 문서화
- `./data_structure.md` 신설
- Prisma 전환 기준 테이블 설계/인덱스/마이그레이션 단계/DoD 정리
