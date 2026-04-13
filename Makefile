.PHONY: setup env env-local run dev dev-d logs stop clean test seed shell studio migrate reset

setup:        ## 사전 요구사항 점검 + compose용 .env 생성
	bash ./scripts/setup-dev.sh --preset=compose

env:          ## compose용 .env 생성
	node ./scripts/init-env.mjs --preset=compose

env-local:    ## 로컬 Node.js 실행용 .env 생성
	node ./scripts/init-env.mjs --preset=local-node

run:          ## clone 직후 실행용: setup 후 docker compose up
	bash ./scripts/run-dev.sh

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

studio:       ## Prisma Studio 실행 (DB GUI)
	docker compose exec back npm run prisma:studio

# ── 테스트 ──────────────────────────────────────────────
test:         ## 통합 테스트 실행 (in-memory 모드)
	docker compose exec back npm test

# ── 유틸 ────────────────────────────────────────────────
shell:        ## back 컨테이너 쉘 진입
	docker compose exec back sh

help:         ## 사용 가능한 명령어 목록
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'
