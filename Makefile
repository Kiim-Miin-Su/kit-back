.PHONY: setup dev dev-d logs stop clean test seed shell studio adminer migrate reset psql help

# ── 최초 설정 ──────────────────────────────────────────
setup:         ## [첫 실행] Docker 확인 + .env 생성 + 서버 시작 + seed
	bash setup.sh

setup-no-seed: ## [첫 실행] seed 없이 설정
	bash setup.sh --no-seed

setup-install: ## [첫 실행] Docker 자동 설치 포함 (macOS/Linux)
	bash setup.sh --install

# ── 개발 환경 ──────────────────────────────────────────
dev:          ## 개발 서버 실행 (foreground, 핫 리로드)
	docker compose up

dev-d:        ## 개발 서버 백그라운드 실행
	docker compose up -d

logs:         ## back 컨테이너 로그 스트리밍
	docker compose logs -f back

stop:         ## 컨테이너 중지 (볼륨 유지)
	docker compose down

clean:        ## 컨테이너 + 볼륨 전체 삭제 (DB 초기화)
	docker compose down -v

reset:        ## DB 초기화 후 재시작
	docker compose down -v && docker compose up

# ── DB / Prisma ─────────────────────────────────────────
migrate:      ## Prisma 마이그레이션 생성 (dev)
	docker compose exec back npx prisma migrate dev

seed:         ## seed 데이터 적재
	docker compose exec back npm run prisma:seed

studio:       ## Prisma Studio 실행 → http://localhost:5555
	docker compose exec back npm run prisma:studio

adminer:      ## Adminer 웹 DB 관리 → http://localhost:8080
	@echo "Adminer: http://localhost:$$(grep ADMINER_PORT .env 2>/dev/null | cut -d= -f2 || echo 8080)"
	@echo "Server: postgres | DB: ai_edu | User: postgres | Password: (빈칸)"

psql:         ## 호스트 터미널에서 PostgreSQL 접속
	psql -h localhost -p $$(grep -E '^POSTGRES_HOST_PORT=' .env | tail -n 1 | cut -d'=' -f2 || echo 5432) -U postgres -d ai_edu

# ── 테스트 ──────────────────────────────────────────────
test:         ## 통합 테스트 실행 (in-memory 모드)
	docker compose exec back npm test

# ── 유틸 ────────────────────────────────────────────────
shell:        ## back 컨테이너 쉘 진입
	docker compose exec back sh

help:         ## 사용 가능한 명령어 목록
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'
