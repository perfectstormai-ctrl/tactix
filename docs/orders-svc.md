# orders-svc

Service providing collaborative orders drafting and templates.

## Env
- `PORT` (default 3006)
- `PGURL` Postgres connection
- `SNAPSHOT_EVERY_UPDATES`
- `SNAPSHOT_EVERY_SECONDS`
- `MAX_UPDATES_RETAIN`
- `JWT_PUBLIC_KEY`
- `ROLE_MAPPING_JSON` optional role mapping

## Endpoints
- `GET /health`
- `GET /orders/templates`
- `GET /orders/templates/:id`
