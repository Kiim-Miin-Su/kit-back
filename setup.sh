#!/usr/bin/env bash
# =============================================================
# AI Edu LMS — Backend 최초 설정 스크립트
#
# 사용법:
#   ./setup.sh              # Docker 자동 설치/실행 확인 + .env 생성 + 서버 시작 + seed
#   ./setup.sh --no-seed    # seed 없이 실행
#   ./setup.sh --no-install # 자동 설치 비활성화
#   ./setup.sh --no-front   # back만 실행
# =============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONT_DIR_DEFAULT="$(cd "${ROOT_DIR}/.." && pwd)/front"
FRONT_DIR="${FRONT_DIR:-${FRONT_DIR_DEFAULT}}"

# ── 색상 출력 ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }
step()    { echo -e "\n${BOLD}▶ $*${RESET}"; }

read_env_var() {
  local file="$1"
  local key="$2"
  local value
  value=$(grep -E "^${key}=" "${file}" 2>/dev/null | tail -n 1 | cut -d'=' -f2- || true)
  printf "%s" "${value}"
}

set_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  tmp="$(mktemp)"

  awk -v k="${key}" -v v="${value}" '
    BEGIN { found = 0 }
    index($0, k "=") == 1 {
      print k "=" v
      found = 1
      next
    }
    { print }
    END {
      if (!found) {
        print k "=" v
      }
    }
  ' "${file}" > "${tmp}"

  mv "${tmp}" "${file}"
}

is_port_in_use() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"${port}" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi

  if command -v nc >/dev/null 2>&1; then
    nc -z localhost "${port}" >/dev/null 2>&1
    return $?
  fi

  if command -v python3 >/dev/null 2>&1; then
    python3 - "${port}" <<'PY' >/dev/null 2>&1
import socket
import sys

port = int(sys.argv[1])
sock = socket.socket()
sock.settimeout(0.5)
result = sock.connect_ex(("127.0.0.1", port))
sock.close()
raise SystemExit(0 if result == 0 else 1)
PY
    return $?
  fi

  return 1
}

find_available_port() {
  local start_port="$1"
  local port="${start_port}"

  while is_port_in_use "${port}"; do
    port=$((port + 1))
  done

  printf "%s" "${port}"
}

# ── 옵션 파싱 ─────────────────────────────────────────────
SKIP_SEED=false
INSTALL_FLAG=""
START_FRONT=true
for arg in "$@"; do
  case $arg in
    --no-seed)  SKIP_SEED=true ;;
    --install)  INSTALL_FLAG="--install" ;;
    --no-install) INSTALL_FLAG="--no-install" ;;
    --no-front) START_FRONT=false ;;
    *) warn "알 수 없는 옵션: $arg" ;;
  esac
done

echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║    AI Edu LMS — Backend Setup        ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${RESET}"

# ══════════════════════════════════════════════════════════
# STEP 1. 사전 요구사항 점검 + .env 생성
#         (scripts/setup-dev.sh 에서 OS별 설치 가이드 제공)
# ══════════════════════════════════════════════════════════
step "사전 요구사항 점검"
bash "${ROOT_DIR}/scripts/setup-dev.sh" --preset=compose ${INSTALL_FLAG}
success "사전 요구사항 확인 완료"

step "호스트 포트 점검"
ENV_FILE="${ROOT_DIR}/.env"
BACK_HOST_PORT="$(read_env_var "${ENV_FILE}" "HOST_PORT")"
POSTGRES_HOST_PORT="$(read_env_var "${ENV_FILE}" "POSTGRES_HOST_PORT")"

[ -n "${BACK_HOST_PORT}" ] || BACK_HOST_PORT=4000
[ -n "${POSTGRES_HOST_PORT}" ] || POSTGRES_HOST_PORT=5432

RESOLVED_BACK_HOST_PORT="$(find_available_port "${BACK_HOST_PORT}")"
RESOLVED_POSTGRES_HOST_PORT="$(find_available_port "${POSTGRES_HOST_PORT}")"

if [ "${RESOLVED_BACK_HOST_PORT}" != "${BACK_HOST_PORT}" ]; then
  warn "HOST_PORT ${BACK_HOST_PORT} 사용 중 → ${RESOLVED_BACK_HOST_PORT}로 변경"
fi

if [ "${RESOLVED_POSTGRES_HOST_PORT}" != "${POSTGRES_HOST_PORT}" ]; then
  warn "POSTGRES_HOST_PORT ${POSTGRES_HOST_PORT} 사용 중 → ${RESOLVED_POSTGRES_HOST_PORT}로 변경"
fi

set_env_var "${ENV_FILE}" "HOST_PORT" "${RESOLVED_BACK_HOST_PORT}"
set_env_var "${ENV_FILE}" "POSTGRES_HOST_PORT" "${RESOLVED_POSTGRES_HOST_PORT}"
success "호스트 포트 확인 완료 (back=${RESOLVED_BACK_HOST_PORT}, postgres=${RESOLVED_POSTGRES_HOST_PORT})"

# compose 커맨드 선택
if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
else
  COMPOSE="docker-compose"
fi

# ══════════════════════════════════════════════════════════
# STEP 2. 컨테이너 시작
# ══════════════════════════════════════════════════════════
step "컨테이너 시작 (postgres + back)"
info "최초 실행 시 node:20-alpine 이미지 다운로드로 수 분 소요될 수 있습니다."
$COMPOSE up -d

# ══════════════════════════════════════════════════════════
# STEP 3. 서버 준비 대기 (healthcheck 기반)
# ══════════════════════════════════════════════════════════
step "서버 준비 대기 (최대 3분)"
info "npm install → prisma generate → prisma migrate → 서버 시작 중..."

MAX_WAIT=180
ELAPSED=0
SPIN=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
SPIN_IDX=0

while true; do
  CONTAINER_ID="$($COMPOSE ps -q back 2>/dev/null || true)"
  STATUS=""

  if [ -n "${CONTAINER_ID}" ]; then
    STATUS="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "${CONTAINER_ID}" 2>/dev/null || echo "")"
  fi

  if [ "$STATUS" = "healthy" ]; then
    echo ""
    success "서버가 준비됐습니다!"
    break
  fi

  if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo ""
    error "서버 시작 시간 초과 (${MAX_WAIT}초)"
    echo ""
    echo "  로그를 확인하세요:  $COMPOSE logs back"
    exit 1
  fi

  printf "\r  ${SPIN[$SPIN_IDX]} 대기 중... (${ELAPSED}s / ${MAX_WAIT}s)"
  SPIN_IDX=$(( (SPIN_IDX + 1) % ${#SPIN[@]} ))
  sleep 3
  ELAPSED=$((ELAPSED + 3))
done

# ══════════════════════════════════════════════════════════
# STEP 4. Seed 데이터 적재
# ══════════════════════════════════════════════════════════
if [ "$SKIP_SEED" = false ]; then
  step "개발용 테스트 데이터 적재 (seed)"
  if $COMPOSE exec back npm run prisma:seed; then
    success "Seed 완료"
  else
    warn "Seed 중 오류가 발생했습니다 (이미 적재된 경우 무시해도 됩니다)."
  fi
else
  info "Seed를 건너뜁니다 (--no-seed 옵션)."
fi

# ══════════════════════════════════════════════════════════
# 완료
# ══════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}${BOLD}✓ 설정 완료!${RESET}"
echo ""
echo "  서비스 주소:"
echo "    REST API   → http://localhost:${RESOLVED_BACK_HOST_PORT}"
echo "    Healthz    → http://localhost:${RESOLVED_BACK_HOST_PORT}/healthz"
echo "    PostgreSQL → localhost:${RESOLVED_POSTGRES_HOST_PORT}"
echo ""
echo "  터미널 DB 접속:"
echo "    psql -h localhost -p ${RESOLVED_POSTGRES_HOST_PORT} -U postgres -d ai_edu"
echo ""
echo "  테스트 계정:"
echo "    학생     → student-demo-01@koreait.academy / password123"
echo "    강사     → instructor-dev-01@koreait.academy / password123"
echo "    관리자   → admin-root@koreait.academy / password123"
echo ""

if [ "${START_FRONT}" = true ] && [ -d "${FRONT_DIR}" ] && [ -f "${FRONT_DIR}/setup.sh" ]; then
  step "프론트엔드 시작"
  info "sibling front 디렉터리 발견: ${FRONT_DIR}"
  (
    cd "${FRONT_DIR}" &&
    bash setup.sh --skip-back-bootstrap ${INSTALL_FLAG}
  )
  success "프론트엔드 준비 완료"
  echo ""
  echo "  전체 서비스 주소:"
  echo "    프론트엔드 → front/.env의 HOST_PORT 참고"
  echo "    백엔드 API → http://localhost:${RESOLVED_BACK_HOST_PORT}"
  echo ""
elif [ "${START_FRONT}" = true ]; then
  warn "sibling front 디렉터리를 찾지 못해 back만 실행했습니다."
  warn "front도 함께 실행하려면 같은 부모 디렉터리에 front 저장소를 둔 뒤 다시 실행하세요."
  echo ""
fi

echo "  이후 실행:"
echo "    make dev     # 서버 재시작"
echo "    make logs    # 로그 보기"
echo "    make help    # 전체 명령어 목록"
echo ""
