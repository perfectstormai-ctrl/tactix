.PHONY: up down logs ps seed

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

ps:
	docker compose ps

seed:
	pnpm -r seed
