# playbook-svc

Provides simple filesystem-backed playbook definitions and trigger endpoint.

## Routes
- `GET /playbooks` — list playbooks (id, name, summary)
- `POST /playbooks/:id/trigger` — body `{ incidentId, operationCode?, message?, severity? }`

## Env Vars
- `PORT` (default 3005)
- `PGURL` connection string for Postgres
- `ORG_CODE` organization code

## Notes
- Reads definitions from `/playbooks/*.json` mounted read-only.
- Triggers emit `NOTIFY tactix_events` with `type: PLAYBOOK_NOTIFY` for realtime fan-out.
