#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRESET="compose"
AUTO_INSTALL=1

for arg in "$@"; do
  case "$arg" in
    --preset=*)
      PRESET="${arg#--preset=}"
      ;;
    --install)
      AUTO_INSTALL=1
      ;;
    --no-install)
      AUTO_INSTALL=0
      ;;
  esac
done

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

is_windows_shell() {
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_wsl() {
  grep -qi microsoft /proc/version 2>/dev/null
}

run_powershell() {
  local script="$1"

  if ! has_cmd powershell.exe; then
    return 1
  fi

  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${script}"
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
    MINGW*|MSYS*|CYGWIN*)
      case "${missing}" in
        docker)
          echo "  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"winget install -e --id Docker.DockerDesktop\""
          ;;
        node)
          echo "  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"winget install -e --id OpenJS.NodeJS.LTS\""
          ;;
        postgres)
          echo "  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command \"winget install -e --id PostgreSQL.PostgreSQL.16\""
          ;;
      esac
      ;;
    *)
      echo "  README.md의 setup 섹션을 참고하세요."
      ;;
  esac
}

try_install() {
  local target="$1"
  local os_name
  os_name="$(uname -s)"

  case "${os_name}" in
    Darwin)
      if ! has_cmd brew; then
        echo "[install] Homebrew가 없어 자동 설치를 건너뜁니다."
        return
      fi
      case "${target}" in
        docker)
          brew install --cask docker
          ;;
        node)
          brew install node
          ;;
        postgres)
          brew install postgresql@16
          ;;
      esac
      ;;
    Linux)
      if is_wsl && [[ "${target}" == "docker" ]]; then
        echo "[install] WSL에서는 Docker Desktop을 Windows에 설치해야 합니다."
        return
      fi

      if ! has_cmd apt-get; then
        echo "[install] apt-get이 없어 자동 설치를 건너뜁니다."
        return
      fi

      sudo apt-get update

      case "${target}" in
        docker)
          sudo apt-get install -y docker.io docker-compose-v2 docker-compose-plugin
          ;;
        node)
          sudo apt-get install -y nodejs npm
          ;;
        postgres)
          sudo apt-get install -y postgresql postgresql-contrib
          ;;
      esac
      ;;
    MINGW*|MSYS*|CYGWIN*)
      if ! has_cmd powershell.exe; then
        echo "[install] powershell.exe가 없어 자동 설치를 건너뜁니다."
        return
      fi

      case "${target}" in
        docker)
          run_powershell "winget install -e --id Docker.DockerDesktop --accept-package-agreements --accept-source-agreements"
          ;;
        node)
          run_powershell "winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements"
          ;;
        postgres)
          run_powershell "winget install -e --id PostgreSQL.PostgreSQL.16 --accept-package-agreements --accept-source-agreements"
          ;;
      esac
      ;;
  esac
}

wait_for_docker_ready() {
  local max_wait="${1:-120}"
  local waited=0

  while (( waited < max_wait )); do
    if docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
      return 0
    fi

    sleep 2
    waited=$((waited + 2))
  done

  return 1
}

ensure_docker_running() {
  if ! has_cmd docker; then
    return 1
  fi

  if docker info >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    return 0
  fi

  local os_name
  os_name="$(uname -s)"

  case "${os_name}" in
    Darwin)
      if has_cmd open; then
        echo "[docker] Docker Desktop 실행 시도"
        open -a Docker >/dev/null 2>&1 || true
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*)
      if has_cmd powershell.exe; then
        echo "[docker] Docker Desktop 실행 시도"
        run_powershell "\$dockerDesktop = Join-Path \$Env:ProgramFiles 'Docker\\Docker\\Docker Desktop.exe'; if (Test-Path \$dockerDesktop) { Start-Process \$dockerDesktop }" >/dev/null 2>&1 || true
      fi
      ;;
    Linux)
      if is_wsl; then
        echo "[docker] WSL에서는 Windows host의 Docker Desktop이 필요합니다."
      else
        if has_cmd systemctl; then
          echo "[docker] systemctl로 docker 서비스 시작 시도"
          sudo systemctl start docker >/dev/null 2>&1 || true
        elif has_cmd service; then
          echo "[docker] service로 docker 서비스 시작 시도"
          sudo service docker start >/dev/null 2>&1 || true
        fi
      fi
      ;;
  esac

  wait_for_docker_ready 120
}

echo "[check] preset=${PRESET}"

MISSING=0

if ! has_cmd docker; then
  echo "[missing] docker"
  if [[ "${AUTO_INSTALL}" -eq 1 ]]; then
    try_install docker
  fi
  print_install_help docker
  if ! has_cmd docker; then
    MISSING=1
  fi
fi

if has_cmd docker && ! docker compose version >/dev/null 2>&1; then
  echo "[missing] docker compose plugin"
  if [[ "${AUTO_INSTALL}" -eq 1 ]]; then
    try_install docker
  fi
  print_install_help docker
  if ! docker compose version >/dev/null 2>&1; then
    MISSING=1
  fi
fi

if has_cmd docker; then
  if ! ensure_docker_running; then
    echo "[missing] running docker daemon"
    print_install_help docker
    MISSING=1
  fi
fi

if ! has_cmd psql; then
  echo "[missing] psql"
  if [[ "${AUTO_INSTALL}" -eq 1 ]]; then
    try_install postgres
  fi
  print_install_help postgres
  if ! has_cmd psql; then
    MISSING=1
  fi
fi

if [[ "${PRESET}" == "local-node" ]]; then
  if ! has_cmd node; then
    echo "[missing] node"
    if [[ "${AUTO_INSTALL}" -eq 1 ]]; then
      try_install node
    fi
    print_install_help node
    if ! has_cmd node; then
      MISSING=1
    fi
  fi

  if ! has_cmd npm; then
    echo "[missing] npm"
    if [[ "${AUTO_INSTALL}" -eq 1 ]]; then
      try_install node
    fi
    print_install_help node
    if ! has_cmd npm; then
      MISSING=1
    fi
  fi

  if ! has_cmd psql && ! has_cmd docker; then
    echo "[missing] postgres client/server or docker for local-node preset"
    if [[ "${AUTO_INSTALL}" -eq 1 ]]; then
      try_install postgres
    fi
    print_install_help postgres
    if ! has_cmd psql && ! has_cmd docker; then
      MISSING=1
    fi
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
HOST_PORT=4000
PORT=4000
POSTGRES_HOST_PORT=5432
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
