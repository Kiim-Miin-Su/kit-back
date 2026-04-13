#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "${ROOT_DIR}/scripts/setup-dev.sh" --preset=compose
cd "${ROOT_DIR}"
docker compose up "$@"
