# Backend Production Checklist

배포 직전과 배포 직후에 `back/`에서 확인할 항목을 정리한다.

---

## 배포 전

- `.env`에 `AUTH_TOKEN_SECRET`, `CORS_ORIGIN`, `POSTGRES_PASSWORD`, `DATABASE_URL`이 실제 운영값인지 확인
- `AUTH_TOKEN_SECRET`은 충분히 긴 랜덤 값인지 확인
- `CORS_ORIGIN`이 실제 프론트 도메인과 정확히 일치하는지 확인
- `DATABASE_URL`이 운영 DB를 가리키는지 확인
- `NODE_ENV=production`에서 기동되는지 확인
- `docker-compose.prod.yml`의 변수명이 `.env`와 맞는지 확인
- migration 컨테이너와 runtime 컨테이너가 같은 DB 설정을 쓰는지 확인
- `DATA_SOURCE=prisma`로 배포하는지 확인

---

## 보안/권한

- 관리자 경로에 `AuthGuard + RolesGuard + @Roles('admin')`가 유지되는지 확인
- 강사 경로에 역할 제한이 유지되는지 확인
- `me/*` 경로가 요청 바디의 사용자 식별자를 신뢰하지 않는지 확인
- 파일 업로드/조회가 현재 로그인 사용자 소유 파일만 허용하는지 확인
- 프론트 role cookie를 백엔드 권한 판단에 사용하지 않는지 확인

---

## CORS / Cookie

- `CORS_ORIGIN`과 프론트 실제 URL이 완전히 같은지 확인
- 프론트가 `withCredentials: true`를 쓰는지 확인
- HTTPS 운영이면 refresh cookie가 `secure`로 내려가는 구조인지 확인
- 프록시 뒤에 둘 경우 원본 프로토콜/호스트 전달이 올바른지 확인

---

## DB / Migration

- 배포 전에 `prisma migrate deploy`가 정상 적용되는지 확인
- seed는 운영에서 자동 실행하지 않는지 확인
- 롤백 시 어떤 migration/백업 전략을 쓸지 미리 정해두기
- 스키마 변경 시 Prisma repository와 memory fallback 계약이 어긋나지 않는지 확인

---

## 배포 파일

필수 확인 파일:

- `Dockerfile`
- `docker-compose.prod.yml`
- `.env`
- `README.md`
- `setup.sh`

확인 항목:

- healthcheck 경로가 `/healthz`와 일치하는지
- 포트 노출이 실제 인프라 설정과 맞는지
- 운영 compose에 필요한 env가 모두 선언됐는지

---

## 배포 직후

- `/healthz` 200 확인
- 로그인 → refresh → 보호 API 호출 흐름 확인
- 관리자 계정으로 `/admin/*` 핵심 기능 확인
- 학생 계정으로 출석/과제 제출 흐름 확인
- 강사 계정으로 제출 리뷰/피드백 흐름 확인
- CORS 오류와 쿠키 미전달 오류가 없는지 브라우저에서 확인

---

## 장애 시 우선 확인 순서

1. 컨테이너 healthcheck 실패 여부
2. migration 실패 여부
3. `CORS_ORIGIN` 오설정 여부
4. refresh cookie 전달 여부
5. `DATABASE_URL` / DB 접근 권한
6. 최근 env 변경 여부
