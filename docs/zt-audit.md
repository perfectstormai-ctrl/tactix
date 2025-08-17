# Zero Trust Audit Tool

The `zt-audit` script scans the repository for common security gaps:

- Comment markers such as `TODO` or `FIXME`
- Route handlers missing `requireAuth`
- WebSocket connections without token checks
- Services missing `/health` or `/openapi.json`
- Unused variables in `.env.example`
- Services that may not log a startup summary

Run locally:

```bash
pnpm zt:audit
```

CI uses:

```bash
pnpm zt:audit:ci
```

The audit generates `zt-audit.json` with details and exits non-zero in CI mode when high severity issues are found.
