import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { verifyJwtRS256, decodeJwt } from './index';
import type { Request, Response } from 'express';

// Simple RSA key pair for tests (generated for testing only)
const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIICXQIBAAKBgQCr4Hknc0NrF4P3nPuCXHDBPPfQtbDNRsTA70vsK1tnE+bBZ5qT
L0U8nyCLlcQFVJHhtq/Y5cHIxHmr18bODsPwhj/KgOMGNJUgIAQ9PEG8D1g0K1T0
xTGVtC6zqD2c/Ik2Vq6KYFAsktwVDqveufqdpypu32n7Z1xXHrp236UMtQIDAQAB
AoGAZmkavRKu0kUQeFk/gQq/i323iDL49myIIZeF1P0uohsEiL/KZ8nfdXbra+XU
4mVTRu6YQ8VE3d2rYZRk5v0zzakDx4zY/boYYGr2susx6bwyodH4qzM7gc3KJ2Yj
p8BgE4nn3OJbGdv8ImZ/Sc7VcRbP5hqjv3Vv4Y20N6l04QECQQDlF6UVx/FuWRzE
6VLdystD5nq2WEYLRh3SeDsICoZ6irMIXja+6JGZveHFkNjEcNWef39/C4R2tQeM
/fi91tILAkEAuifaRl6VwBEm90Lk9R/+qvOB0fOkH1ZZ1xd6QbaO5jM90oCbGyF2
fs/3Gzdh0dX8GZFODdgNpTi27C/7fyqCkQJBALuLHcEGoVYLRNvKcJsteVEh9Up7
P88GJEqn3Ejj6inUeJ8V+RaH//RUW2KIiMzFxLpy0X58F3RDeo63eNbUsGECQCBt
TJS3BM4tiTqcKoy0eZZ+j9RnBbTK1Z4VBPakiobP6KyHR+Y6z+4PSJVpaz6RtWLw
HtkobaN6D+PfYZ7RUTECQQCxKCGbdJrYzsaLxwDyZaG0/gt0XiY8h1NIsDPKySx1
d7zbIR3IgwxM/H2ymlk/wEYBLETymFcpnSUsctNk6heF
-----END RSA PRIVATE KEY-----`;

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIGeMA0GCSqGSIb3DQEBAQUAA4GMADCBiAKBgQCr4Hknc0NrF4P3nPuCXHDBPPfQ
tbDNRsTA70vsK1tnE+bBZ5qTL0U8nyCLlcQFVJHhtq/Y5cHIxHmr18bODsPwhj/K
gOMGNJUgIAQ9PEG8D1g0K1T0xTGVtC6zqD2c/Ik2Vq6KYFAsktwVDqveufqdpypu
32n7Z1xXHrp236UMtQIDAQAB
-----END PUBLIC KEY-----`;

describe('verifyJwtRS256 middleware', () => {
  const mw = verifyJwtRS256(PUBLIC_KEY);

  it('passes with valid token', () => {
    const token = jwt.sign({ sub: 'alice', ad_groups: ['OPS_X'] }, PRIVATE_KEY, {
      algorithm: 'RS256',
      expiresIn: '1h',
    });
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const res: any = { status: (_: number) => res, json: (_: any) => res };
    let called = false;
    mw(req as Request, res as Response, () => {
      called = true;
    });
    expect(called).toBe(true);
    expect(req.user?.upn).toBe('alice');
  });

  it('rejects expired token', () => {
    const token = jwt.sign(
      { sub: 'alice', ad_groups: [], exp: Math.floor(Date.now() / 1000) - 10 },
      PRIVATE_KEY,
      { algorithm: 'RS256' }
    );
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    let status = 200;
    const res: any = {
      status: (s: number) => {
        status = s;
        return res;
      },
      json: () => res,
    };
    mw(req as Request, res as Response, () => {});
    expect(status).toBe(401);
  });

  it('rejects signature mismatch', () => {
    const other = jwt.sign({ sub: 'bob' }, PRIVATE_KEY, {
      algorithm: 'RS256',
    });
    const req: any = { headers: { authorization: `Bearer ${other}` } };
    let status = 200;
    const res: any = {
      status: (s: number) => {
        status = s;
        return res;
      },
      json: () => res,
    };
    mw(req as Request, res as Response, () => {});
    expect(status).toBe(401);
  });
});

describe('decodeJwt', () => {
  it('maps roles from ad groups', () => {
    process.env.ROLE_MAPPING_JSON = '{"^OPS_": ["VIEWER"]}';
    const token = jwt.sign({ sub: 'alice', ad_groups: ['OPS_1'] }, PRIVATE_KEY, {
      algorithm: 'RS256',
    });
    const user = decodeJwt(token, PUBLIC_KEY);
    expect(user.roles).toContain('VIEWER');
  });
});
