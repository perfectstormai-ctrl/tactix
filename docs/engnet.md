# ENGNET Engineering Chat

This feature provides an unofficial engineering channel between TACTIX instances on the same network. It uses NATS for transport and a standalone `eng-svc` for REST and WebSocket access.

## Enabling

1. Ensure `eng-svc` and `nats` services are enabled in `docker-compose.yml`.
2. Set environment variables in `ops/env/eng.env`:
   - `ORG_CODE` – organisation code shared across instances
   - `NATS_URL` – NATS connection string (e.g. `nats://nats:4222`)
   - `ENG_ALLOWED_ROLES` – comma separated roles allowed to post
   - `JWT_PUBLIC_KEY` – public key used to verify JWTs
   - `DATABASE_URL` – Postgres connection string
3. Proxy `/eng/*` and `/eng/ws` through the gateway (already configured in `ops/nginx.conf`).
4. Start the stack with `docker compose up`.
5. Set `ENG_ENABLED=true` in the UI environment to display the panel.

Messages are retained in the `eng_messages` table for the period defined by `ENG_RETENTION_HOURS` (default 48 hours).
