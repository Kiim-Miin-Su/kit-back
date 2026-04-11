# Backend Progress Info (2026-04-09)

## 이번 턴 완료 항목
1. Nest 실행 환경 복구
- `node_modules` 설치
- DTO 검증 패키지 추가:
  - `class-validator`
  - `class-transformer`

2. 관리자 API 구조 코드화
- `src/admin` 모듈 신설 및 컨트롤러/DTO/서비스 분리
- 전역 `ValidationPipe` 적용

3. 관리자 규칙 구현(골격)
- classScope 자동 생성
- 수업 날짜 윈도우 검증
- 학생 정원(capacity) 검증
- 일정 date/scope/출석 시간창 검증
- attendance scope `global + classScope` 강제

4. 감사로그 엔드포인트 연결
- `GET /courses/:courseId/assignment-audit`

5. 빌드 검증
- `npm -C ../back run build` 통과

## 다음 구현 우선순위
1. 제출/리뷰 영속화 API 구현
2. 파일 업로드(첨부/과제 자료) API 구현
3. 강의 영상 업로드 + 트랜스코딩 파이프라인
4. 강의 영상 플레이어용 토큰/진도 API

## 문서 참조
- 상위 기준: `../INFO.md`
- 프론트 핸드오프 상세: `./FRONT_HANDOFF_2026-04-09.md`
- 프론트 아키텍처 문서: `../../front/progress/architecture.md`

---

# Backend Progress Info (2026-04-11)

## 이번 턴 완료 항목
1. `tsconfig.json` 보강
- `moduleResolution: node`
- `types: [\"node\"]`
- `resolveJsonModule: true`
- `forceConsistentCasingInFileNames: true`

2. 제출/리뷰 API(P0) 구현
- `GET /me/assignments/workspace`
- `POST /me/assignments/submissions`
- `GET /instructor/assignments/workspace`
- `POST /instructor/assignments`
- `PATCH /instructor/assignments/:assignmentId`
- `PUT /instructor/assignments/:assignmentId/template`
- `PATCH /instructor/assignments/submissions/:submissionId`
- `POST /instructor/assignments/submissions/:submissionId/feedback`
- `GET /submissions/:submissionId`
- `GET /instructor/assignments/:assignmentId/timeline`

3. 저장소 구조(interface + in-memory) 분리
- `AssignmentsRepository` 인터페이스 정의
- `InMemoryAssignmentsRepository` 구현
- `AssignmentsService`는 저장소 구현체에 의존하지 않도록 분리

4. 감사로그 연계
- 제출/재제출/리뷰상태변경/피드백/과제수정/템플릿수정 이벤트를
  `AdminService` 감사로그에 기록하도록 연동

5. 빌드 검증
- `npm run build` 통과

6. front-aligned mock-data 통일
- `src/mock-data/front-aligned.mock.ts` 신설
- admin / assignments / files 모듈이 동일 seed를 공유하도록 정렬
- 회원검색/검증용 사용자 데이터(`userId`, `userName`, `birthDate`)를 프론트 기준으로 통일

7. front -> back 통합 테스트 강화
- `test/front-back-flow.test.js`에서 관리자/제출/파일/일정 흐름 통합 검증
- Nest `TestingModule` + DTO 검증 기반으로 정상/예외 케이스를 함께 점검
- `npm test` 통과 (4 passed)

8. attachments <-> files 참조 연결
- 제출/피드백 첨부에서 `attachment.id=fileId` 기반 연결 검증 추가
- 연결 가능한 첨부는 파일 저장소 메타(`fileName`, `contentType`, `size`)로 정규화
- 연결 검증 에러코드 추가:
  - `ATTACHMENT_FILE_NOT_FOUND`
  - `ATTACHMENT_FILE_FORBIDDEN`
  - `ATTACHMENT_FILE_NOT_READY`

## 다음 구현 우선순위
1. `files presign/complete` owner 권한 검증 추가
2. 영상 업로드/트랜스코딩 API 구현
3. 플레이어 토큰/진도 API 구현
4. in-memory 저장소를 Prisma 기반 구현으로 교체
5. HTTP 실서버 기반 통합 테스트 파이프라인(로컬/CI) 구축

---

# Backend Progress Info (2026-04-12)

## 코드 대조 결과
1. 실제 완료
- `admin`, `assignments`, `files`, `health`, `auth`, `users`, `courses`, `enrollments`, `attendance`는 실행 코드가 있다.

2. 실제 미완료
- `files` owner 검증은 아직 느슨하다.
- `assignments`, `admin`은 role guard를 아직 본격 적용하지 않았다.
- 실제 DB는 아직 연결하지 않았다.

3. 프론트 실연동을 막는 순서
- 핵심 학생 플로우는 로컬에서 로그인/수강/출석까지 가능하다.
- 아직 fallback 제거 전이라 프론트는 API 실패 시 mock으로 내려간다.

## 다음 작업 순서
1. Files owner 검증
- 현재 `ownerId`를 요청 본문으로 직접 받으므로 인증 연동 전 보강이 필요.

2. Assignments/Admin 인증 확장
- 강사/관리자 role guard를 실제 사용자 컨텍스트 기준으로 붙인다.

3. Prisma 전환
- in-memory 패턴이 안정화된 뒤 저장소 구현체만 교체.
