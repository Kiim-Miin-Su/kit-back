# 🤝 Contributing Guide

이 문서는 프로젝트에 기여할 때 지켜야 할 규칙과 가이드를 정의한다.  
모든 기여자는 아래 내용을 반드시 확인하고 준수한다.

---

## 📌 Commit Convention

### 🧩 Format

```
[<type>] <summary>: "text"
```

### ✅ 예시

```
[feat] 로그인 API 구현: "JWT 기반 인증 로직 추가"
[fix] 토큰 만료 오류 수정: "시간 계산 로직 버그 해결"
[opt] 쿼리 최적화: "N+1 문제 해결 및 성능 개선"
[refac] 서비스 구조 개선: "비즈니스 로직 분리"
```

---

## 🏷️ Type 정의

| Type   | 설명 |
|--------|------|
| feat   | 새로운 기능 추가 |
| fix    | 버그 수정 |
| opt    | 최적화, 성능 개선, 운영 관련 변경 |
| style  | 코드 스타일 변경 (포맷팅 등) |
| docs   | 문서 수정 |
| test   | 테스트 코드 추가/수정 |
| refac  | 리팩토링 (기능 변화 없음) |
| etc    | 기타 |

---

## ✏️ 작성 규칙

### 1. type
- 반드시 정의된 타입 중 하나 사용
- 소문자 유지

### 2. summary
- 한 줄 요약
- 50자 이내 권장
- 명확하게 작성

### 3. text
- 변경 이유 중심으로 작성
- 큰따옴표(" ") 사용

---

## ❌ Bad Examples

```
[feat] 기능 추가
fix bug
update code
test commit
```

---

## 🌿 Branch Strategy

| 브랜치 | 설명 |
|--------|------|
| main   | 배포 가능한 상태 |
| dev    | 개발 통합 브랜치 |
| feature/* | 기능 개발 |
| fix/*  | 버그 수정 |
| hotfix/* | 긴급 수정 |

### 예시

```
feature/login-api
fix/token-expire
```

---

## 🔄 Workflow

1. 최신 코드 가져오기
```
git pull origin dev
```

2. 브랜치 생성
```
git checkout -b feature/기능명
```

3. 개발 및 커밋 (Convention 준수)

4. push
```
git push origin feature/기능명
```

5. Pull Request 생성 → dev 브랜치로

---

## ✅ Pull Request 규칙

- 제목: 작업 내용 요약
- 커밋 메시지 규칙 준수
- 불필요한 코드 포함 금지
- 하나의 PR은 하나의 목적만

---

## 🚀 Best Practice

- 커밋은 작게 나눈다
- 의미 단위로 작성한다
- 코드 + 메시지 둘 다 명확하게 작성한다

---

## 📎 Optional (Scope 확장)

```
[feat/auth] 로그인 기능 추가: "OAuth2 연동"
[fix/payment] 결제 오류 수정: "중복 결제 방지"
```

---

> ✔️ 목표: 코드 변경 이력을 명확하게 관리하고 협업 효율을 높인다.
