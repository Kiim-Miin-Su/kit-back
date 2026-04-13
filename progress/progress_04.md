# Backend Progress — 2026-04-13 (세션 2)

## 이번 세션 요약

front 서비스를 back의 `docker-compose.yml`에 통합하고,  
관리자 등록 커스텀 일정을 학생 출석 워크스페이스 API에 포함하도록 수정했습니다.  
아울러 데이터 공유 기준 버그 2건을 추가 수정했습니다.

---

## 변경 사항

### front 서비스 통합 (`docker-compose.yml`)

`back/docker-compose.yml`에 `front` 서비스를 추가했습니다.

- `node:20-alpine` 이미지로 `../front` 디렉터리를 `/workspace`에 마운트
- `front_node_modules` named volume으로 node_modules 분리
- `back` 서비스가 `healthy` 상태가 된 후 자동 기동 (`depends_on`)
- `docker compose down` 한 번으로 back + front + db 전체 정리 가능
- `WATCHPACK_POLLING`, `CHOKIDAR_USEPOLLING`으로 Docker 환경 핫 리로드 보장

**영향 범위:**

| 파일 | 변경 내용 |
|------|-----------|
| `docker-compose.yml` | `front` 서비스 및 `front_node_modules` 볼륨 추가 |
| `setup.sh` | `FRONT_HOST_PORT` 포트 해결 + front 준비 대기 (최대 3분) 추가 |
| `.env.example` | `FRONT_HOST_PORT`, `NEXT_PUBLIC_DEV_ROLE_BYPASS`, `CORS_ORIGIN` 추가 |
| `Makefile` | `logs-front` 타겟 추가, `stop`/`clean` 설명 업데이트 |
| `README.md` | 서비스 테이블에 프론트엔드 행 추가, 환경 변수 테이블 업데이트 |

### 버그 수정 — 관리자 커스텀 일정 학생 공유

**문제:** `AttendanceService.getWorkspace()`가 DB 템플릿 일정만 반환하고,  
`AdminService`의 in-memory 커스텀 일정은 학생에게 전혀 제공되지 않았습니다.

**해결:**

1. `admin.service.ts` — `getCustomSchedulesForScopes(scopes)` 메서드 추가  
   - `sourceType === "CUSTOM"` 이고 `global` 또는 수강 중인 `classScope`에 해당하는 일정만 반환

2. `attendance.module.ts` — `AdminModule` import 추가

3. `attendance.service.ts` — `AdminService` 주입, `getWorkspace()`에서 커스텀 일정 병합  
   - 커스텀 일정은 `supportsCodeCheckIn: false`로 설정 (QR 체크인 미지원)
   - `requiresAttendanceCheck: true`인 경우 `attendanceStatus: "NOT_CHECKED_IN"` 초기화

**데이터 흐름 (수정 후):**

```
관리자: POST /admin/schedules
  → AdminService.schedules[] (in-memory)

학생: GET /me/attendance/workspace
  → AttendanceService.getWorkspace()
      ├── DB 템플릿 일정 (prisma)
      └── AdminService.getCustomSchedulesForScopes()  ← 추가
          → visibilityType === "global" OR visibilityScope === 수강 classScope
```

### 버그 수정 — `GET /auth/me` 응답 필드 불일치

**문제:** `auth.service.ts`의 `getMe()`가 `userId`를 반환했으나,  
프론트엔드 `AuthUser` 타입은 `id` 필드를 기대.

**해결:** `getMe()`에서 `{ id: user.userId, ... }` 로 명시적 매핑.

### 버그 수정 — 과제 워크스페이스에 PENDING/COMPLETED 수강 포함

**문제:** `assignments.service.ts`의 `syncStudentProfileFromEnrollments()`가  
수강 상태와 무관하게 모든 수강 기록을 포함.

**해결:** `.filter((course) => course.enrollmentStatus === "ACTIVE")`로  
실제 수강 중인 과목만 과제 워크스페이스에 반영.

---

## 데이터 공유 버그 수정 요약

| # | 위치 | 문제 | 수정 |
|---|------|------|------|
| 1 | `attendance.service.ts` | 관리자 커스텀 일정이 학생 API에 미포함 | AdminService 주입 + 일정 병합 |
| 2 | `auth.service.ts` | `getMe()` → `userId` 반환, FE는 `id` 기대 | `id: user.userId` 매핑 |
| 3 | `assignments.service.ts` | PENDING/COMPLETED 수강도 과제에 포함 | ACTIVE만 필터 |

---

## 현재 구현 상태

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

> `admin` 도메인 커스텀 일정은 현재 서버 in-memory 저장이므로,  
> 서버 재시작 시 소멸합니다. Prisma 전환이 필요합니다.

---

## 다음 구현 우선순위

### P0 — admin 커스텀 일정 Prisma 영속화

서버 재시작 시 커스텀 일정이 소멸하는 문제를 해결하기 위해  
`admin` 도메인을 Prisma 구현체로 전환해야 합니다.

```
prisma/schema.prisma  ← CustomSchedule 모델 추가
src/admin/prisma-admin.repository.ts  ← 신규 작성
```

### P1 — Prisma 저장소 전환 (assignments, files)

```
src/assignments/prisma-assignments.repository.ts
src/files/prisma-files.repository.ts
```

### P1 — AuthGuard 적용 범위 확장

`assignments`, `admin`, `files` 컨트롤러에 `@UseGuards(AuthGuard, RolesGuard)` 적용 필요.

### P2 — 로그인 버튼 클릭 후 로그인 화면으로 미이동 버그

`TopNavigation`의 로그인 버튼이 `/sign-in`으로 라우팅되지 않는 문제.  
`sign-in/page.tsx`에서 `useSearchParams()` 사용 시 `Suspense` 경계 필요 여부 확인.

---

## 참고 문서

| 문서 | 내용 |
|------|------|
| [`INFO.md`](./INFO.md) | 아키텍처 기준 문서 |
| [`FRONT_HANDOFF_2026-04-09.md`](./FRONT_HANDOFF_2026-04-09.md) | 프론트엔드 API 계약 상세 |
| [`progress_03.md`](./progress_03.md) | 이전 세션 진행 기록 |
