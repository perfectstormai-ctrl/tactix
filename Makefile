.PHONY: up down logs ps seed

up:
	docker compose up --build

down:
	docker compose down -v

logs:
	docker compose logs -f

ps:
	docker compose ps

seed:
	pnpm -r seed
