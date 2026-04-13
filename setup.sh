#!/usr/bin/env bash
# =============================================================
# AI Edu LMS — Backend 최초 설정 스크립트
#
# 사용법:
#   ./setup.sh              # Docker 확인 + .env 생성 + 서버 시작 + seed
#   ./setup.sh --no-seed    # seed 없이 실행
#   ./setup.sh --install    # 누락된 도구 자동 설치 (macOS Homebrew / Linux apt)
# =============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

# ── 옵션 파싱 ─────────────────────────────────────────────
SKIP_SEED=false
INSTALL_FLAG=""
for arg in "$@"; do
  case $arg in
    --no-seed)  SKIP_SEED=true ;;
    --install)  INSTALL_FLAG="--install" ;;
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
  STATUS=$($COMPOSE ps --format json back 2>/dev/null \
    | python3 -c "
import sys, json
data = sys.stdin.read().strip()
if not data: print(''); exit()
rows = [json.loads(l) for l in data.split('\n') if l.strip()]
print(rows[0].get('Health','') if rows else '')
" 2>/dev/null || echo "")

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
echo "    REST API   → http://localhost:4000"
echo "    Swagger UI → http://localhost:4000/api-docs"
echo "    Healthz    → http://localhost:4000/healthz"
echo ""
echo "  테스트 계정:"
echo "    학생     → student-demo-01@koreait.academy / password123"
echo "    강사     → instructor-dev-01@koreait.academy / password123"
echo "    관리자   → admin-root@koreait.academy / password123"
echo ""
echo "  이후 실행:"
echo "    make dev     # 서버 재시작"
echo "    make logs    # 로그 보기"
echo "    make help    # 전체 명령어 목록"
echo ""
