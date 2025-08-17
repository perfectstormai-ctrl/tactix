# playbook-svc

Stores incident-scoped playbooks and allows manual runs that emit in-app notifications.

## Routes
- `GET /incidents/:incidentId/playbooks` — list playbooks for an incident
- `POST /incidents/:incidentId/playbooks` — create `{ name, json }`
- `GET /playbooks/:id` — fetch playbook JSON
- `POST /playbooks/:id/run` — body `{ incidentId, message?, severity? }`

## Env Vars
- `PORT` (default 3005)
- `PGURL` connection string for Postgres
- `ORG_CODE` organization code

## Notes
- Playbooks are stored in Postgres (`playbooks`, `playbook_runs` tables).
- Runs emit `NOTIFY tactix_events` with `type: PLAYBOOK_NOTIFY` for realtime fan-out.
