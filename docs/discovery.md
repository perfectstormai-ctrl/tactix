# Discovery Service

The discovery service announces TACTIX servers on the local network and listens for peers.

## Purpose
- Advertise this instance on the LAN using mDNS and UDP broadcast.
- Maintain a cache of discovered servers.
- Expose the cache at `GET /discovery/servers`.

## Enabling
Start `discovery-svc` alongside the gateway. The gateway forwards `/discovery/*` to this service.

## Environment Variables
- `PORT` (default 3000): HTTP port.
- `ANNOUNCE_PORT` (default `PORT`): port advertised to peers.
- `KEYS_DIR` (default `/data/keys`): path for persisted keypair.
- `ANNOUNCE_HOST` (default `localhost`): hostname used in UDP records.

## Security
Discovery records are signed with an Ed25519 key. The public key and signature are included in UDP broadcasts so clients can verify authenticity.
