# Zero-Trust Conformance

This document outlines how to run the experimental Zero‑Trust profile for
TACTIX.  The profile exercises mTLS and basic authentication flows so that
services can be validated locally.

## Prerequisites

- Docker and docker compose
- Node.js 20 with `corepack enable`
- `pnpm` dependencies installed (`pnpm -r install`)

## Generating Certificates

```bash
# create internal certificate authority
ops/certs/make-int-ca.sh

# generate a leaf certificate for the auth service
ops/certs/make-leaf.sh auth-service
```

Certificates are written under `ops/certs` and can be reused by the compose
profile.

## Bringing up the stack

```bash
# build images and start services with the Zero‑Trust profile
docker compose -f compose/docker-compose.zt.yml up -d --build
```

The profile enables mutual TLS between the gateway and core services and sets
`SERVICES_REQUIRE_MTLS=true`.

## Running tests

The repository contains an evolving conformance suite under
`tests/zt-conformance`.  To execute the suite:

```bash
pnpm -w test:zt
```

## Notes

This profile is intended for development and automated testing.  It does not
modify the default `docker-compose.yml` behaviour and can be extended as the
full Zero‑Trust feature set grows.
