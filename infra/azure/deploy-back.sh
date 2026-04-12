#!/usr/bin/env bash
set -euo pipefail

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env: $name" >&2
    exit 1
  fi
}

to_lower() {
  echo "$1" | tr '[:upper:]' '[:lower:]'
}

slugify() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/--+/-/g'
}

require_env "AZURE_RESOURCE_GROUP"
require_env "AZURE_ACR_NAME"
require_env "AZURE_CONTAINERAPPS_ENV"
require_env "AZURE_KEY_VAULT_NAME"
require_env "DOMAIN_NAME"
require_env "DEPLOY_ENV"
require_env "IMAGE_TAG"

PROJECT_NAME="$(to_lower "${PROJECT_NAME:-ai-edu}")"
DEPLOY_ENV="$(to_lower "$DEPLOY_ENV")"
BASE_SLUG="$(slugify "${PROJECT_NAME}-${DEPLOY_ENV}")"

AZURE_CONTAINER_APP_BACK="${AZURE_CONTAINER_APP_BACK:-${BASE_SLUG}-back}"
AZURE_CONTAINER_APP_JOB_MIGRATE="${AZURE_CONTAINER_APP_JOB_MIGRATE:-${BASE_SLUG}-migrate}"

az extension add --name containerapp --upgrade --yes >/dev/null

az acr build \
  --registry "$AZURE_ACR_NAME" \
  --image "back:${IMAGE_TAG}" \
  --file Dockerfile \
  . \
  --output none

ACR_LOGIN_SERVER="$(
  az acr show \
    --name "$AZURE_ACR_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --query loginServer \
    --output tsv
)"
ACR_USERNAME="$(
  az acr credential show \
    --name "$AZURE_ACR_NAME" \
    --query username \
    --output tsv
)"
ACR_PASSWORD="$(
  az acr credential show \
    --name "$AZURE_ACR_NAME" \
    --query passwords[0].value \
    --output tsv
)"

DATABASE_URL="$(
  az keyvault secret show \
    --vault-name "$AZURE_KEY_VAULT_NAME" \
    --name "database-url" \
    --query value \
    --output tsv
)"
AUTH_TOKEN_SECRET="$(
  az keyvault secret show \
    --vault-name "$AZURE_KEY_VAULT_NAME" \
    --name "auth-token-secret" \
    --query value \
    --output tsv
)"
OPENAI_API_KEY="$(
  az keyvault secret show \
    --vault-name "$AZURE_KEY_VAULT_NAME" \
    --name "openai-api-key" \
    --query value \
    --output tsv
)"

BACK_IMAGE="${ACR_LOGIN_SERVER}/back:${IMAGE_TAG}"
APP_HOST="app.${DOMAIN_NAME}"

if az containerapp show \
  --name "$AZURE_CONTAINER_APP_BACK" \
  --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  az containerapp secret set \
    --name "$AZURE_CONTAINER_APP_BACK" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --secrets \
      "database-url=${DATABASE_URL}" \
      "auth-token-secret=${AUTH_TOKEN_SECRET}" \
      "openai-api-key=${OPENAI_API_KEY}" \
    --output none

  az containerapp registry set \
    --name "$AZURE_CONTAINER_APP_BACK" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --server "$ACR_LOGIN_SERVER" \
    --username "$ACR_USERNAME" \
    --password "$ACR_PASSWORD" \
    --output none

  az containerapp update \
    --name "$AZURE_CONTAINER_APP_BACK" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --image "$BACK_IMAGE" \
    --set-env-vars \
      NODE_ENV=production \
      PORT=4000 \
      DATA_SOURCE=prisma \
      CORS_ORIGIN="https://${APP_HOST}" \
      DATABASE_URL=secretref:database-url \
      AUTH_TOKEN_SECRET=secretref:auth-token-secret \
      OPENAI_API_KEY=secretref:openai-api-key \
    --output none
else
  az containerapp create \
    --name "$AZURE_CONTAINER_APP_BACK" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --environment "$AZURE_CONTAINERAPPS_ENV" \
    --image "$BACK_IMAGE" \
    --ingress external \
    --target-port 4000 \
    --registry-server "$ACR_LOGIN_SERVER" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD" \
    --cpu 1.0 \
    --memory 2.0Gi \
    --min-replicas 1 \
    --max-replicas 2 \
    --secrets \
      "database-url=${DATABASE_URL}" \
      "auth-token-secret=${AUTH_TOKEN_SECRET}" \
      "openai-api-key=${OPENAI_API_KEY}" \
    --env-vars \
      NODE_ENV=production \
      PORT=4000 \
      DATA_SOURCE=prisma \
      CORS_ORIGIN="https://${APP_HOST}" \
      DATABASE_URL=secretref:database-url \
      AUTH_TOKEN_SECRET=secretref:auth-token-secret \
      OPENAI_API_KEY=secretref:openai-api-key \
    --output none
fi

az containerapp revision set-mode \
  --name "$AZURE_CONTAINER_APP_BACK" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --mode Single \
  --output none

if az containerapp job show \
  --name "$AZURE_CONTAINER_APP_JOB_MIGRATE" \
  --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  az containerapp job secret set \
    --name "$AZURE_CONTAINER_APP_JOB_MIGRATE" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --secrets \
      "database-url=${DATABASE_URL}" \
      "auth-token-secret=${AUTH_TOKEN_SECRET}" \
      "openai-api-key=${OPENAI_API_KEY}" \
    --output none

  az containerapp job update \
    --name "$AZURE_CONTAINER_APP_JOB_MIGRATE" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --image "$BACK_IMAGE" \
    --registry-server "$ACR_LOGIN_SERVER" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD" \
    --env-vars \
      NODE_ENV=production \
      DATA_SOURCE=prisma \
      DATABASE_URL=secretref:database-url \
      AUTH_TOKEN_SECRET=secretref:auth-token-secret \
      OPENAI_API_KEY=secretref:openai-api-key \
    --command npx \
    --args prisma migrate deploy \
    --output none
else
  az containerapp job create \
    --name "$AZURE_CONTAINER_APP_JOB_MIGRATE" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --environment "$AZURE_CONTAINERAPPS_ENV" \
    --trigger-type Manual \
    --replica-timeout 1800 \
    --replica-retry-limit 1 \
    --replica-completion-count 1 \
    --parallelism 1 \
    --image "$BACK_IMAGE" \
    --registry-server "$ACR_LOGIN_SERVER" \
    --registry-username "$ACR_USERNAME" \
    --registry-password "$ACR_PASSWORD" \
    --cpu 0.5 \
    --memory 1.0Gi \
    --secrets \
      "database-url=${DATABASE_URL}" \
      "auth-token-secret=${AUTH_TOKEN_SECRET}" \
      "openai-api-key=${OPENAI_API_KEY}" \
    --env-vars \
      NODE_ENV=production \
      DATA_SOURCE=prisma \
      DATABASE_URL=secretref:database-url \
      AUTH_TOKEN_SECRET=secretref:auth-token-secret \
      OPENAI_API_KEY=secretref:openai-api-key \
    --command npx \
    --args prisma migrate deploy \
    --output none
fi

az containerapp job start \
  --name "$AZURE_CONTAINER_APP_JOB_MIGRATE" \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --output none
