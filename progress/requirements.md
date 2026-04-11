# backend

## structure
- `src/assignments/assignment.repository.ts`
  - 저장소 인터페이스(`AssignmentsRepository`) 정의
- `src/assignments/in-memory-assignments.repository.ts`
  - 현재 개발 단계 기본 저장소(in-memory)
- `src/assignments/assignments.service.ts`
  - 비즈니스 로직 계층 (저장소 구현체와 분리)
- `src/assignments/*controller.ts`
  - API 엔드포인트 계층
- `src/assignments/dto/*`
  - 요청 DTO 검증 계층

## requirements
### DB 전략
- 저장소는 반드시 interface를 먼저 정의한다.
- 개발 초기에는 in-memory 구현으로 빠르게 검증한다.
- 이후 Prisma/실DB 구현체를 추가하고 DI provider만 교체해서 전환한다.

### 보안/안정성
- DTO 기반 입력 검증(`ValidationPipe`) 유지
- whitelist/forbidNonWhitelisted 정책 유지
- 에러 응답은 코드 기반으로 고정해 프론트 매핑 안정성 확보
- 민감정보 저장/노출 금지(현재 시드 데이터는 샘플 데이터만 사용)
