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

compact_alnum() {
  echo "$1" | tr -cd '[:alnum:]' | tr '[:upper:]' '[:lower:]'
}

slugify() {
  echo "$1" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/--+/-/g'
}

require_env "AZURE_CLIENT_ID"
require_env "AZURE_LOCATION"
require_env "AZURE_POSTGRES_ADMIN_PASSWORD"
require_env "DEPLOY_ENV"
require_env "OPENAI_API_KEY"

PROJECT_NAME="$(to_lower "${PROJECT_NAME:-ai-edu}")"
DEPLOY_ENV="$(to_lower "$DEPLOY_ENV")"
BASE_SLUG="$(slugify "${PROJECT_NAME}-${DEPLOY_ENV}")"
BASE_COMPACT="$(compact_alnum "${PROJECT_NAME}${DEPLOY_ENV}")"

AZURE_RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-${BASE_SLUG}-rg}"
AZURE_ACR_NAME="${AZURE_ACR_NAME:-${BASE_COMPACT}acr}"
AZURE_LOG_ANALYTICS_WORKSPACE="${AZURE_LOG_ANALYTICS_WORKSPACE:-${BASE_SLUG}-logs}"
AZURE_CONTAINERAPPS_ENV="${AZURE_CONTAINERAPPS_ENV:-${BASE_SLUG}-env}"
AZURE_KEY_VAULT_NAME="${AZURE_KEY_VAULT_NAME:-${BASE_SLUG}-kv}"
AZURE_POSTGRES_SERVER_NAME="${AZURE_POSTGRES_SERVER_NAME:-${BASE_SLUG}-pg}"
AZURE_POSTGRES_ADMIN_USERNAME="${AZURE_POSTGRES_ADMIN_USERNAME:-ai_edu_admin}"
AZURE_POSTGRES_DATABASE_NAME="${AZURE_POSTGRES_DATABASE_NAME:-ai_edu}"

az extension add --name containerapp --upgrade --yes >/dev/null

for provider in \
  Microsoft.App \
  Microsoft.OperationalInsights \
  Microsoft.ContainerRegistry \
  Microsoft.KeyVault \
  Microsoft.DBforPostgreSQL; do
  az provider register --namespace "$provider" >/dev/null
done

az group create \
  --name "$AZURE_RESOURCE_GROUP" \
  --location "$AZURE_LOCATION" \
  --output none

if ! az acr show --name "$AZURE_ACR_NAME" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  az acr create \
    --name "$AZURE_ACR_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --location "$AZURE_LOCATION" \
    --sku Basic \
    --admin-enabled true \
    --output none
fi

if ! az monitor log-analytics workspace show \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --workspace-name "$AZURE_LOG_ANALYTICS_WORKSPACE" >/dev/null 2>&1; then
  az monitor log-analytics workspace create \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --workspace-name "$AZURE_LOG_ANALYTICS_WORKSPACE" \
    --location "$AZURE_LOCATION" \
    --output none
fi

WORKSPACE_ID="$(
  az monitor log-analytics workspace show \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --workspace-name "$AZURE_LOG_ANALYTICS_WORKSPACE" \
    --query customerId \
    --output tsv
)"
WORKSPACE_KEY="$(
  az monitor log-analytics workspace get-shared-keys \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --workspace-name "$AZURE_LOG_ANALYTICS_WORKSPACE" \
    --query primarySharedKey \
    --output tsv
)"

if ! az containerapp env show \
  --name "$AZURE_CONTAINERAPPS_ENV" \
  --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  az containerapp env create \
    --name "$AZURE_CONTAINERAPPS_ENV" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --location "$AZURE_LOCATION" \
    --logs-workspace-id "$WORKSPACE_ID" \
    --logs-workspace-key "$WORKSPACE_KEY" \
    --output none
fi

if ! az keyvault show --name "$AZURE_KEY_VAULT_NAME" --resource-group "$AZURE_RESOURCE_GROUP" >/dev/null 2>&1; then
  az keyvault create \
    --name "$AZURE_KEY_VAULT_NAME" \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --location "$AZURE_LOCATION" \
    --enable-rbac-authorization false \
    --output none
fi

az keyvault set-policy \
  --name "$AZURE_KEY_VAULT_NAME" \
  --spn "$AZURE_CLIENT_ID" \
  --secret-permissions get list set delete backup restore recover purge \
  --output none

if ! az postgres flexible-server show \
  --resource-group "$AZURE_RESOURCE_GROUP" \
  --name "$AZURE_POSTGRES_SERVER_NAME" >/dev/null 2>&1; then
  az postgres flexible-server create \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "$AZURE_POSTGRES_SERVER_NAME" \
    --location "$AZURE_LOCATION" \
    --admin-user "$AZURE_POSTGRES_ADMIN_USERNAME" \
    --admin-password "$AZURE_POSTGRES_ADMIN_PASSWORD" \
    --database-name "$AZURE_POSTGRES_DATABASE_NAME" \
    --sku-name Standard_B1ms \
    --tier Burstable \
    --storage-size 32 \
    --version 16 \
    --public-access 0.0.0.0 \
    --yes \
    --output none
else
  az postgres flexible-server db create \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --server-name "$AZURE_POSTGRES_SERVER_NAME" \
    --database-name "$AZURE_POSTGRES_DATABASE_NAME" \
    --output none || true
fi

POSTGRES_FQDN="$(
  az postgres flexible-server show \
    --resource-group "$AZURE_RESOURCE_GROUP" \
    --name "$AZURE_POSTGRES_SERVER_NAME" \
    --query fullyQualifiedDomainName \
    --output tsv
)"

DATABASE_URL="postgresql://${AZURE_POSTGRES_ADMIN_USERNAME}:${AZURE_POSTGRES_ADMIN_PASSWORD}@${POSTGRES_FQDN}:5432/${AZURE_POSTGRES_DATABASE_NAME}?sslmode=require"
AUTH_TOKEN_SECRET_VALUE="${AUTH_TOKEN_SECRET:-}"

if [[ -z "$AUTH_TOKEN_SECRET_VALUE" ]]; then
  AUTH_TOKEN_SECRET_VALUE="$(openssl rand -hex 32)"
fi

az keyvault secret set \
  --vault-name "$AZURE_KEY_VAULT_NAME" \
  --name "database-url" \
  --value "$DATABASE_URL" \
  --output none

az keyvault secret set \
  --vault-name "$AZURE_KEY_VAULT_NAME" \
  --name "auth-token-secret" \
  --value "$AUTH_TOKEN_SECRET_VALUE" \
  --output none

az keyvault secret set \
  --vault-name "$AZURE_KEY_VAULT_NAME" \
  --name "openai-api-key" \
  --value "$OPENAI_API_KEY" \
  --output none
