# TACTIX

Minimum Viable Slice (MVS) of the Tactical Assistance and Collaboration Tool for Incident eXchange.

This repository contains a containerized skeleton for the core services:

- **gateway** – NGINX reverse proxy
- **auth-svc** – LDAP authentication and JWT issuance
- **incident-svc** – event‑sourced incident tracking
- **tak-ingest-svc** – Cursor-on-Target ingest pipeline
- **realtime-svc** – WebSocket gateway
- **ui** – placeholder web UI

## Getting Started

Install Docker and run:

```bash
docker-compose up --build
```

Each service exposes a basic `/health` endpoint.

## Development

Node packages use simple test scripts:

```bash
npm test
```

These are placeholders until real tests are added.
