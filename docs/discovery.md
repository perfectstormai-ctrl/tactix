# LAN Discovery

`discovery-svc` announces TACTIX servers on the local network using mDNS. Clients can query `/discovery/servers` to obtain
nearby servers and `/discovery/announce` to start broadcasting this instance.

- Service type: `_tactix._tcp`
- TXT keys: `id`, `role`, `ver`, `fp`, `tls`
- Health check: `GET /discovery/health`

The service stores its Ed25519 key pair under `/data/discovery/keys` and uses the public key fingerprint to identify the
server. Records older than 60 seconds are pruned from the cache.
