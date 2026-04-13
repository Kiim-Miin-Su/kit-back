#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRESET="compose"

for arg in "$@"; do
  case "$arg" in
    --preset=*)
      PRESET="${arg#--preset=}"
      ;;
  esac
done

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

is_wsl() {
  grep -qi microsoft /proc/version 2>/dev/null
}

print_install_help() {
  local missing="$1"
  local os_name
  os_name="$(uname -s)"

  echo ""
  echo "[install guide] missing: ${missing}"

  case "${os_name}" in
    Darwin)
      case "${missing}" in
        docker)
          echo "  brew install --cask docker"
          ;;
        node)
          echo "  brew install node"
          ;;
        postgres)
          echo "  brew install postgresql@16"
          ;;
      esac
      ;;
    Linux)
      if is_wsl; then
        case "${missing}" in
          docker)
            echo "  Windows host에서 Docker Desktop 설치 후 WSL integration을 켜세요."
            echo "  PowerShell 예시: winget install -e --id Docker.DockerDesktop"
            ;;
          node)
            echo "  sudo apt-get update && sudo apt-get install -y nodejs npm"
            ;;
          postgres)
            echo "  sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib"
            ;;
        esac
      else
        case "${missing}" in
          docker)
            echo "  https://docs.docker.com/engine/install/ 참고 후 docker compose plugin까지 설치하세요."
            ;;
          node)
            echo "  sudo apt-get update && sudo apt-get install -y nodejs npm"
            ;;
          postgres)
            echo "  sudo apt-get update && sudo apt-get install -y postgresql postgresql-contrib"
            ;;
        esac
      fi
      ;;
    *)
      echo "  README.md의 setup 섹션을 참고하세요."
      ;;
  esac
}

echo "[check] preset=${PRESET}"

MISSING=0

if ! has_cmd docker; then
  echo "[missing] docker"
  print_install_help docker
  MISSING=1
fi

if has_cmd docker && ! docker compose version >/dev/null 2>&1; then
  echo "[missing] docker compose plugin"
  print_install_help docker
  MISSING=1
fi

if [[ "${PRESET}" == "local-node" ]]; then
  if ! has_cmd node; then
    echo "[missing] node"
    print_install_help node
    MISSING=1
  fi

  if ! has_cmd npm; then
    echo "[missing] npm"
    print_install_help node
    MISSING=1
  fi

  if ! has_cmd psql && ! has_cmd docker; then
    echo "[missing] postgres client/server or docker for local-node preset"
    print_install_help postgres
    MISSING=1
  fi
else
  if ! has_cmd node || ! has_cmd npm; then
    echo "[optional] local node/npm이 없으면 Docker Compose 경로만 사용 가능합니다."
  fi
fi

if [[ ! -f "${ROOT_DIR}/.env" ]]; then
  if has_cmd node; then
    node "${ROOT_DIR}/scripts/init-env.mjs" --preset="${PRESET}"
  else
    cat > "${ROOT_DIR}/.env" <<'EOF'
# Generated for Docker Compose development
PORT=4000
CORS_ORIGIN=http://localhost:3000

# memory | prisma
DATA_SOURCE=prisma

# Docker Compose 내부 postgres 사용
DATABASE_URL=postgresql://postgres@postgres:5432/ai_edu

# 선택값
POSTGRES_PASSWORD=
AUTH_TOKEN_SECRET=
OPENAI_API_KEY=
EOF
    echo "[env] created compose-safe .env"
  fi
else
  echo "[env] .env already exists"
fi

echo ""
echo "[next]"
if [[ "${PRESET}" == "compose" ]]; then
  echo "  1. docker compose up"
  echo "  2. open http://localhost:4000/healthz"
else
  echo "  1. postgres를 localhost:5432에서 실행"
  echo "  2. npm install"
  echo "  3. npm run prisma:generate"
  echo "  4. npm run start:dev:prisma"
fi

exit "${MISSING}"
