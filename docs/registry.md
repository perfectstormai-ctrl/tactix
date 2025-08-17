# Registry Service

The registry service allows TACTIX servers to publish a network address that remote clients can discover.

## Endpoints

- `POST /registry/register` – body: `{ serverId, url, fingerprint, signedRecord }`.
- `GET /registry/lookup?serverId=...` – returns `{ url, fingerprint }` when a record exists.

This reference implementation stores records in memory and exposes a simple health endpoint at `/health`.

## Security

The sample service performs no authentication and should only be used for experimentation.
