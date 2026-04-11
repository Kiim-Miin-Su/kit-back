# Front -> Back Handoff (2026-04-09)

## 0) 목적
- 프론트 최신 구현을 기준으로 백엔드 API/DB 계약을 고정한다.
- 관리자 도메인(수업/멤버/일정/출석 scope/감사로그)과 제출 도메인 연계를 즉시 구현 가능 상태로 전달한다.

## 1) 현재 프론트 확정 동작
1. 관리자 수업 운영
- 학원 전체 수업을 조회/생성/삭제한다.
- `classScope`는 클라이언트 입력을 받지 않고 서버에서 자동 생성해야 한다.

2. 멤버 배치
- 관리자 사용자 신규 생성 UI는 없음.
- 배치 전 사용자 검증: `이름 + 생년월일(YYYY-MM-DD) + 아이디(userId)` 3항목이 모두 일치해야 한다.
- 검증 성공 사용자만 `INSTRUCTOR | ASSISTANT | STUDENT` 역할로 수업 배치 가능.

3. 정원 정책
- 정원(capacity)은 `STUDENT`만 카운트.
- `INSTRUCTOR`, `ASSISTANT`는 정원 계산 제외.

4. 일정 운영
- 휴일 관리가 아닌 일정 CRUD로 운영.
- 반복 등록(매일/매주)은 프론트가 N회 `POST /admin/schedules` 호출로 전개.
- 일정 템플릿 저장/불러오기는 현재 프론트 로컬스토리지 사용(백엔드 템플릿 API 미사용).

5. 출석 scope 정책
- 수업별 `allowedScheduleScopes` 편집/저장.
- `global` + 해당 수업 `classScope`는 서버에서 강제 포함해야 함.

6. 감사 로그
- `/admin/courses/{courseId}/audit` 화면에서 course 단위 과제/제출/리뷰 이벤트 조회.

## 1.1) 역할별 운영 권한(프론트 정책)
- `STUDENT`: 수업/일정/멤버 정보 조회만 가능(읽기 전용).
- `ASSISTANT`: 멤버 권한 운영 + 당일 일정 변경 가능.
- `INSTRUCTOR`: 수업 등록/수정 + 일정 운영 + 멤버 권한 운영 가능.
- 실제 권한 판정은 서버가 course-role binding 기준으로 강제해야 한다.

## 2) 필수 API 계약

### 2.1 관리자 워크스페이스
1. `GET /admin/users/workspace`
- 목적: 관리자 메인 초기 데이터 로드
- response
```json
{
  "courses": [
    {
      "courseId": "course-ai-4",
      "courseTitle": "AI Product Engineering 4기",
      "category": "AI 개발",
      "classScope": "ai-product-engineering-4",
      "status": "ACTIVE",
      "sectionLabel": "4기 A반",
      "roomLabel": "8층 AI 강의실",
      "capacity": 30,
      "startDate": "2026-04-20",
      "endDate": "2026-07-12",
      "enrollmentStartDate": "2026-04-01",
      "enrollmentEndDate": "2026-04-27",
      "pacingType": "INSTRUCTOR_PACED"
    }
  ],
  "users": [
    {
      "userId": "student-kim-hana",
      "userName": "김하나",
      "birthDate": "2001-03-14",
      "title": "수강생",
      "defaultRole": "STUDENT"
    }
  ],
  "memberBindings": [
    {
      "courseId": "course-ai-4",
      "userId": "student-kim-hana",
      "role": "STUDENT"
    }
  ]
}
```

### 2.2 사용자 검증/검색
1. `GET /admin/users/search?query={query}`
- 목적: 멤버 배치 전 사용자 검증
- 검색 최소조건:
  - `userId` exact/prefix
  - `userName` contains
  - `birthDate` exact 또는 contains
- response
```json
{
  "users": [
    {
      "userId": "student-kim-hana",
      "userName": "김하나",
      "birthDate": "2001-03-14",
      "title": "수강생",
      "defaultRole": "STUDENT"
    }
  ]
}
```
- 중요: `birthDate` 누락 시 프론트 검증 실패 가능.

### 2.3 수업 생성/삭제
1. `POST /admin/courses`
- request
```json
{
  "courseTitle": "AI Product Engineering 4기",
  "category": "AI 개발",
  "sectionLabel": "4기 A반",
  "roomLabel": "8층 AI 강의실",
  "capacity": 30,
  "startDate": "2026-04-20",
  "endDate": "2026-07-12",
  "enrollmentStartDate": "2026-04-01",
  "enrollmentEndDate": "2026-04-27",
  "pacingType": "INSTRUCTOR_PACED"
}
```
- 서버 규칙
  - `classScope`는 서버 생성(클라이언트 입력 무시)
  - 날짜 윈도우 검증 수행

2. `DELETE /admin/courses/{courseId}`
- 서버 규칙
  - course member binding 삭제
  - 해당 `classScope` 일정 정합성 보장(삭제/비활성 정책 중 하나로 일관 처리)
  - attendance scope policy 정리

### 2.4 멤버 배치
1. `PUT /admin/courses/{courseId}/members/{userId}/role`
- request
```json
{ "role": "INSTRUCTOR" }
```
- 서버 규칙
  - `role=STUDENT`일 때만 정원 검증
  - upsert 동작(기존 있으면 역할 변경)

2. `DELETE /admin/courses/{courseId}/members/{userId}`

### 2.5 일정 관리
1. `GET /admin/schedules/workspace`
- response
```json
{
  "schedules": [
    {
      "id": "schedule-001",
      "title": "오리엔테이션",
      "categoryLabel": "운영",
      "dateKey": "2026-04-20",
      "dateLabel": "4월 20일 월",
      "timeLabel": "19:00 - 21:00",
      "locationLabel": "8층 AI 강의실",
      "visibilityType": "class",
      "visibilityScope": "ai-product-engineering-4",
      "visibilityLabel": "AI Product Engineering 4기 수업",
      "requiresAttendanceCheck": true,
      "attendanceWindowStartAt": "2026-04-20T18:30:00+09:00",
      "attendanceWindowEndAt": "2026-04-20T19:20:00+09:00",
      "attendanceWindowLabel": "19:20까지 인증 가능",
      "sourceType": "CUSTOM"
    }
  ],
  "scopes": [
    {
      "visibilityType": "global",
      "visibilityScope": "global",
      "visibilityLabel": "학원 전체 행사"
    }
  ]
}
```

2. `POST /admin/schedules`
3. `PUT /admin/schedules/{scheduleId}`
4. `DELETE /admin/schedules/{scheduleId}`

### 2.6 출석 scope 정책
1. `GET /admin/courses/{courseId}/attendance-scope-workspace`
2. `PUT /admin/courses/{courseId}/attendance-scopes`
- request
```json
{
  "allowedScheduleScopes": ["global", "ai-product-engineering-4"]
}
```
- 서버 강제
  - 항상 `global` 포함
  - 항상 해당 course의 `classScope` 포함

### 2.7 수업 감사로그
1. `GET /courses/{courseId}/assignment-audit`
- response item 필수 필드
```json
{
  "id": "audit-001",
  "courseId": "course-ai-4",
  "assignmentId": "assignment-11",
  "assignmentTitle": "LLM 프롬프트 개선",
  "submissionId": "submission-991",
  "actorId": "assistant-dev-01",
  "actorName": "개발용 조교",
  "actorRole": "ASSISTANT",
  "action": "FEEDBACK_ADDED",
  "occurredAt": "2026-04-09T12:20:00.000Z",
  "note": "피드백 코멘트 추가"
}
```

## 3) 타입(백엔드 기준)

### 3.1 Enum
- `AdminCourseMemberRole = INSTRUCTOR | ASSISTANT | STUDENT`
- `AdminCourseStatus = ACTIVE | PENDING`
- `AdminCoursePacingType = INSTRUCTOR_PACED | SELF_PACED`
- `ScheduleVisibilityType = global | class`
- `AdminScheduleSourceType = SYSTEM | CUSTOM`
- `AdminCourseAuditActionType = SUBMITTED | RESUBMITTED | REVIEW_STATUS_CHANGED | FEEDBACK_ADDED | ASSIGNMENT_UPDATED | TEMPLATE_UPDATED`

### 3.2 핵심 DTO
```ts
interface AdminCourseWorkspaceUser {
  userId: string;
  userName: string;
  birthDate?: string; // YYYY-MM-DD
  title: string;
  defaultRole: "INSTRUCTOR" | "ASSISTANT" | "STUDENT";
}

interface AdminCourseMemberBinding {
  courseId: string;
  userId: string;
  role: "INSTRUCTOR" | "ASSISTANT" | "STUDENT";
}

interface AdminCourseWorkspaceCourse {
  courseId: string;
  courseTitle: string;
  category: string;
  classScope: string;
  status: "ACTIVE" | "PENDING";
  sectionLabel: string;
  roomLabel: string;
  capacity: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  enrollmentStartDate: string; // YYYY-MM-DD
  enrollmentEndDate: string; // YYYY-MM-DD
  pacingType: "INSTRUCTOR_PACED" | "SELF_PACED";
}

interface AdminScheduleEvent {
  id: string;
  title: string;
  categoryLabel: string;
  dateKey: string; // YYYY-MM-DD
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
  visibilityType: "global" | "class";
  visibilityScope: string;
  visibilityLabel: string;
  requiresAttendanceCheck: boolean;
  attendanceWindowStartAt?: string; // ISO datetime
  attendanceWindowEndAt?: string; // ISO datetime
  attendanceWindowLabel?: string;
  sourceType: "SYSTEM" | "CUSTOM";
}
```

## 4) 서버 검증 규칙
1. 사용자 검증
- `userId` 존재 필수
- 이름 비교: trim + 연속공백 축소 후 exact
- 생년월일 비교: `YYYY-MM-DD` exact

2. 수업 날짜 윈도우
- `startDate <= endDate`
- `enrollmentStartDate <= enrollmentEndDate <= endDate`

3. 정원
- 동일 course에서 `role=STUDENT`만 count
- `role=STUDENT` 배치/변경 시 capacity 초과면 실패

4. 일정
- `dateKey`는 `YYYY-MM-DD`
- `requiresAttendanceCheck=true`이면 `attendanceWindowEndAt` 필수
- `visibilityType=global`이면 `visibilityScope=global` 허용

5. 출석 scope 정책
- 입력에서 누락되어도 저장 직전 `global`, `classScope` 강제 삽입

6. 삭제 정합성
- 수업 삭제 시 member binding/attendance scope policy/연관 class 일정 정리

## 5) 권장 에러코드
- `USER_NOT_FOUND`
- `USER_NAME_MISMATCH`
- `USER_BIRTHDATE_MISMATCH`
- `COURSE_NOT_FOUND`
- `COURSE_CAPACITY_EXCEEDED`
- `INVALID_DATE_WINDOW`
- `INVALID_SCHEDULE_SCOPE`
- `INVALID_ATTENDANCE_SCOPE_POLICY`
- `FORBIDDEN_ROLE_ASSIGNMENT`

프론트 메시지 매핑(중요):
- `USER_NOT_FOUND` -> "입력한 아이디로 가입된 사용자를 찾을 수 없습니다."
- `USER_NAME_MISMATCH` -> "입력한 이름이 회원정보와 일치하지 않습니다."
- `USER_BIRTHDATE_MISMATCH` -> "입력한 생년월일이 회원정보와 일치하지 않습니다."
- `COURSE_CAPACITY_EXCEEDED` -> 정원 초과 안내

## 6) DB 권장 모델 및 제약
1. `users`
- `id (pk)`, `name`, `birth_date date`, `global_role`, `created_at`, `updated_at`
- index: `(name)`, `(birth_date)`

2. `courses`
- `id (pk)`, `title`, `category`, `class_scope unique`, `status`, `section_label`, `room_label`, `capacity`, `start_date`, `end_date`, `enrollment_start_date`, `enrollment_end_date`, `pacing_type`, `created_at`, `updated_at`

3. `course_member_bindings`
- `course_id fk`, `user_id fk`, `role`, `created_at`, `updated_at`
- unique: `(course_id, user_id)`
- index: `(course_id, role)`

4. `schedules`
- `id (pk)`, `title`, `category_label`, `date_key`, `time_label`, `location_label`, `visibility_type`, `visibility_scope`, `requires_attendance_check`, `attendance_window_start_at`, `attendance_window_end_at`, `source_type`, `created_at`, `updated_at`
- index: `(date_key)`, `(visibility_type, visibility_scope)`

5. `attendance_scope_policies`
- `course_id pk/fk`, `class_scope`, `allowed_schedule_scopes jsonb`, `updated_at`

6. `course_assignment_audit_events`
- `id (pk)`, `course_id`, `assignment_id`, `assignment_title`, `submission_id`, `actor_id`, `actor_name`, `actor_role`, `action`, `occurred_at`, `note`
- index: `(course_id, occurred_at desc)`

## 7) 트랜잭션/동시성 권장
1. 멤버 배치
- 학생 배치 시 `course_member_bindings` upsert와 정원 확인을 동일 트랜잭션으로 처리.
- race condition 방지를 위해 course row lock 또는 원자적 카운트 전략 적용.

2. 수업 삭제
- course/member/scope-policy/schedule 정리를 단일 트랜잭션으로 묶거나 보상 로직을 명시적으로 둔다.

3. 일정 반복 등록
- 프론트가 N회 호출하므로 단건 create endpoint는 빠르고 일관된 검증을 유지해야 한다.

## 8) 백엔드 구현 우선순위
1. `GET /admin/users/search`에 `birthDate` 보장
2. `PUT /admin/courses/{courseId}/members/{userId}/role` 정원 검증
3. `GET/PUT /admin/courses/{courseId}/attendance-scope-workspace|attendance-scopes`
4. 관리자 일정 CRUD DTO/검증 확정
5. `GET /courses/{courseId}/assignment-audit`

## 9) 참고
- 프론트 진행 로그: `../front/progress/progress_08.md`
- 프론트 구조 문서: `../front/progress/INFO.md`
- 백엔드 기준 문서: `../back/INFO.md`
