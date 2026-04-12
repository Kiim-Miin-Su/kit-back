# Backend Azure Deploy

> 이 문서는 `back` GitHub 레포 기준이다.

## 이 레포가 맡는 역할
- Azure 기본 인프라 생성
- PostgreSQL / Key Vault / Container Apps Environment 관리
- 백엔드 앱 배포
- Prisma migration job 실행

## 이 레포에 두는 것이 맞는 파일
- `infra/azure/create-infra.sh`
- `infra/azure/deploy-back.sh`
- `infra/azure/README.md`
- `.github/workflows/azure-infra.yml`
- `.github/workflows/azure-deploy-staging.yml`
- `.github/workflows/azure-deploy-production.yml`

## GitHub Environment 위치
- `back` 레포
- `Settings -> Environments`
- `staging`, `production` 각각 생성

## GitHub Variables
- `PROJECT_NAME`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_TENANT_ID`
- `AZURE_CLIENT_ID`
- `AZURE_LOCATION`
- `DOMAIN_NAME`
- `AZURE_RESOURCE_GROUP`
- `AZURE_ACR_NAME`
- `AZURE_LOG_ANALYTICS_WORKSPACE`
- `AZURE_CONTAINERAPPS_ENV`
- `AZURE_KEY_VAULT_NAME`
- `AZURE_POSTGRES_SERVER_NAME`
- `AZURE_POSTGRES_ADMIN_USERNAME`
- `AZURE_POSTGRES_DATABASE_NAME`
- `AZURE_CONTAINER_APP_BACK`
- `AZURE_CONTAINER_APP_JOB_MIGRATE`

## GitHub Secrets
- `AZURE_POSTGRES_ADMIN_PASSWORD`
- `OPENAI_API_KEY`
- `AUTH_TOKEN_SECRET`

## 권장 예시값
- `PROJECT_NAME=ai-edu`
- `AZURE_LOCATION=koreacentral`
- `AZURE_RESOURCE_GROUP=ai-edu-staging-rg`
- `AZURE_ACR_NAME=aiedustagingacr`
- `AZURE_LOG_ANALYTICS_WORKSPACE=ai-edu-staging-logs`
- `AZURE_CONTAINERAPPS_ENV=ai-edu-staging-env`
- `AZURE_KEY_VAULT_NAME=ai-edu-staging-kv`
- `AZURE_POSTGRES_SERVER_NAME=ai-edu-staging-pg`
- `AZURE_POSTGRES_ADMIN_USERNAME=ai_edu_admin`
- `AZURE_POSTGRES_DATABASE_NAME=ai_edu`
- `AZURE_CONTAINER_APP_BACK=ai-edu-staging-back`
- `AZURE_CONTAINER_APP_JOB_MIGRATE=ai-edu-staging-migrate`

## 실행 순서
1. `staging` environment 변수/시크릿 입력
2. `azure-infra.yml` 실행
3. `azure-deploy-staging.yml` 실행
4. `https://api.<domain>/healthz` 확인
5. 동일 구조로 `production` 환경 입력
6. `azure-infra.yml`를 `production`으로 실행
7. `azure-deploy-production.yml` 실행

## 백엔드 런타임 기준
- `NODE_ENV=production`
- `DATA_SOURCE=prisma`
- `PORT=4000`
- `CORS_ORIGIN=https://app.<domain>`
- `DATABASE_URL` from Key Vault
- `AUTH_TOKEN_SECRET` from Key Vault
- `OPENAI_API_KEY` from Key Vault

## 사용자가 직접 해야 하는 일
- Azure App Registration + GitHub OIDC 연동
- DNS `api.<domain>` 연결
- Key Vault 값 확인
- GitHub Environment 값 입력
- Workflow 수동 실행 승인

## 참고
- 루트 총괄 문서: [`../AZURE_DEPLOY_HANDOFF.md`](../AZURE_DEPLOY_HANDOFF.md)
- Azure 스크립트 안내: [`../infra/azure/README.md`](../infra/azure/README.md)
