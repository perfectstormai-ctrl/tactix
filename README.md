# TACTIX

## Description
TACTIX (Tactical Assistance and Collaboration Tool for Incident eXchange) is a modular, containerized platform for tracking and sharing incident data in real time. The project provides a Minimum Viable Slice (MVS) that stitches together the core services required for ingest, authentication, incident tracking and collaborative presentation.

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

## Redis Streams Demo

The realtime service includes simple producer/consumer scripts demonstrating
Redis Streams usage. Example keys:

- `rt.incident.{id}` – incident-specific stream
- `rt.system.broadcast` – system-wide broadcast stream

Run the producer to append a message:

```bash
node services/realtime-svc/stream-producer.js rt.system.broadcast "hello"
```

Start the consumer to read and persist the last ID, allowing replay after
restart:

```bash
node services/realtime-svc/stream-consumer.js rt.system.broadcast
```

The consumer stores the last seen ID in a local file and resumes from that
point on subsequent runs.
