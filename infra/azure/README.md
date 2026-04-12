# Backend Azure Infra

이 디렉터리는 `back` 레포 기준 Azure 배포 자산이다.

## 파일
- `create-infra.sh`
  - Resource Group
  - ACR
  - Log Analytics
  - Container Apps Environment
  - Key Vault
  - PostgreSQL Flexible Server
  - Key Vault secret 입력

- `deploy-back.sh`
  - 백엔드 이미지 빌드
  - `back` Container App 생성/업데이트
  - Prisma migration Job 생성/업데이트 및 실행

## 워크플로
- `.github/workflows/azure-infra.yml`
- `.github/workflows/azure-deploy-staging.yml`
- `.github/workflows/azure-deploy-production.yml`
