# Server Invite Codes

`discovery-svc` can issue short lived invite codes that embed the server's identity and address.

`GET /discovery/invite` → `{ invite, qrPng }`

The `invite` field is a base64 encoded JSON object:

```json
{
  "serverId": "<uuid>",
  "url": "https://server",
  "fingerprint": "<sha256>",
  "exp": 1693497600,
  "sig": "<ed25519 signature>"
}
```

To verify an invite, clients call `POST /discovery/verify-invite` with the `invite` string. The service validates the
Ed25519 signature and expiration before returning the decoded fields.
