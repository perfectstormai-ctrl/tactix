import { describe, it, expect, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  verifyJwtRS256,
  roleMapperFromEnv,
  resolveRoles,
  requireRole,
  type AuthenticatedRequest,
} from './index';
import type { Response } from 'express';

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDocKY5H8ackf+k
t9KoWJqxZ3x8tIo3K2F9cxf1EOsarSNPk+G4x+ETnWxiJ9rZ5a/F4o0EwC3tXwhd
r8BQUDSVh1LlZyB76iufPDBcSmmQs+65tpwTb8W4WVD3c3LU8n9n80RgzKWB1jok
FfJXJqDLTH4wUhJbYrAWsqk73eUlIPvDKnf2Ywvl2zfNPaUiGm/Kx6Rs+IrrXgKa
2scAZG0wg8zrJpVtgnkmnWO46dTr1k77adfZ/8C1QEEsQCJNXMJmEfUnSpxG5af7
O9i12JBJBuFBz6fVovgJUy4pEUPOf/U86M/uIdyIEab1nXoD1Fzk4jpdk+b9FFGt
ym/jRKqtAgMBAAECggEAEnABF23oVLoWA6xbJuRkXOcfDktJ3WdxA8Dx6QwPAh4y
u1i5Im2kcmhd1QlhSEB6aWF3myVdX0NXCAttX1GFYkkKL8022+1uyWI+WcvDROmo
6Y1NIxOOJPncvMwpEzArIAVBasZA6KQkF4GwJ+6V+ZpXNiEEeMBCxIImf2uyBfhJ
nAK15IAhFnYjGSwkRTe/dxZfwY2dzeaeju9nnZ4OxLtrDQem5uiuQ/1uD1qDt60p
pBtwEqmRGWYAPl8K8PbcW+qKClA+2NIvvIPF8tzZJXZrMfCngB2Z42HH1luBzQCh
lHowQ8alCIwX84uosQ/7epw8spiEgaNbYizxS9TgMQKBgQD3oQ7IXytZTdPX8GAb
4Hf2PhJVhjaTrCXvyJ+4jk8gmYXMgvL/fyGHqe+JP6MtSZ0MMwku6nUtfPnkPtRQ
aRKCTGl3ZvWOymwjbvAe7gJhKsWaITX9eM8Y/xN+jBQyAsakFrJlFN+ZXuJxzleH
h+KmvPXmvsg1NrFJbKt0/JEJdQKBgQDwTCXJMAxbktKIGvOTe0y0ptcySyypfQAo
aZZBcA489wK9Yx6Ja4GPPCJKaxCtx6ffwy2oaeh/OmMwXfTab3dReFYuLb2RNpgr
gNI9esc83enJUDpBmvH1sYzd30FdT//OnsBESqZctaZB5qiMcAr/LoLnEWcbRk6x
aMWTxMm9WQKBgQDTKcZ/W5iNqO5zgAmU/A+QLlJYGAFGYFBhb4W0TbZwKDqOsUQi
V/jxxRn8wgWWQuXnV0YHeeu+hIpb9q/6ef9MmXh+V5Ai2b7pYFrnJTNmRKEI1DVE
FtcTi8DF8xHtq6xUlP4/cFNUaDNVtQ2zB09hvFU9FYeIyUDZSg/TzOSpWQKBgCbn
/Vo0uFt/Sy0USAnB9ept9PvEpiePAJ6KcfSIYxXF3KCzUrdnO6PoVZj8+sdYQzr8
jADvnOA0oOis3b8cOxJqzHFPoJjJYRvyEJg5r9aQC5E3tyb2ImToaWlnA1tLX5yh
oXmtKIBsPM4AvZt3bKBidHlbHPmSiZ053HuPaiaJAoGAI61SwjOoL08kAJ4Ql5aV
5VObA7iH6hprRXe9hjsZg85xxQqZqXhfs6O2GRgB/3OJqvhlT6W7tBCMY8KzAWKb
cpYENWXriS2Bhu7iJO5JaQsz0R+pyjDTs2/HKOEVU7geV9ZC79T8nKB6nNNSkMDM
HGPPsiSJ4U/p8lvFe02dRH0=
-----END PRIVATE KEY-----`;

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6HCmOR/GnJH/pLfSqFia
sWd8fLSKNythfXMX9RDrGq0jT5PhuMfhE51sYifa2eWvxeKNBMAt7V8IXa/AUFA0
lYdS5Wcge+ornzwwXEppkLPuubacE2/FuFlQ93Ny1PJ/Z/NEYMylgdY6JBXyVyag
y0x+MFISW2KwFrKpO93lJSD7wyp39mML5ds3zT2lIhpvysekbPiK614CmtrHAGRt
MIPM6yaVbYJ5Jp1juOnU69ZO+2nX2f/AtUBBLEAiTVzCZhH1J0qcRuWn+zvYtdiQ
SQbhQc+n1aL4CVMuKRFDzn/1POjP7iHciBGm9Z16A9Rc5OI6XZPm/RRRrcpv40Sq
rQIDAQAB
-----END PUBLIC KEY-----`;

describe('verifyJwtRS256', () => {
  const jwtTools = verifyJwtRS256(PUBLIC_KEY);

  it('accepts valid token', () => {
    const token = jwt.sign({ sub: 'alice' }, PRIVATE_KEY, {
      algorithm: 'RS256',
      expiresIn: '1h',
    });
    const payload = jwtTools.verify(token) as any;
    expect(payload.sub).toBe('alice');
  });

  it('rejects expired token', () => {
    const token = jwt.sign({ sub: 'alice', exp: Math.floor(Date.now()/1000) - 10 }, PRIVATE_KEY, {
      algorithm: 'RS256',
    });
    expect(() => jwtTools.verify(token)).toThrow();
  });

  it('rejects bad signature', () => {
    const other = jwt.sign({ sub: 'bob' }, PRIVATE_KEY, {
      algorithm: 'RS256',
    });
    const otherTools = verifyJwtRS256('-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApR6UytzszbmWzxubUoil\nm0ytehZMhUlCT3VkOITkkpFmS6r30YIOCwVDDDeWGPA7eGRIDcH+xr3aMcMBXNIN\n61WGy7kYEcCkZBHwNOpyYOux/Q3ZxLE3TltDJoZ8msdT4eJOOFbg0zu1zD8SWu6j\n7U8J0uIK4WMbe6PfUu8tkFncraEw9loMZEvUyMjyC5sma6AsVzTdDEr1xgG+Z6kT\nj7yvGN28AL/fOHnqd7qV3CyMfCVxYvBy06SnVAk0nnBYnCTsRmRykGGBqBPdZiZB\nI2sMSmc5QwDFi1Cdm42Hcps225y7sY9qsK0kGugHgd6Nq35p3xNmPR9U1FVLtZL1\n0wIDAQAB\n-----END PUBLIC KEY-----');
    expect(() => otherTools.verify(other)).toThrow();
  });
});

describe('role mapping', () => {
  beforeEach(() => {
    process.env.ROLE_MAPPING_JSON = '{".*_DO$": ["DO"], "G3_OPS": ["G3 OPS"]}';
  });

  it('maps roles using regex', () => {
    const mapper = roleMapperFromEnv();
    const roles = resolveRoles(['OPNAMEXX-X_DO', 'G3_OPS'], mapper);
    expect(roles).toContain('DO');
    expect(roles).toContain('G3 OPS');
  });
});

describe('requireRole', () => {
  it('returns 403 when role missing', () => {
    const req: AuthenticatedRequest = { user: { upn: 'a', ad_groups: [], roles: [] } } as any;
    let status = 200;
    const res: Response = {
      status(code: number) {
        status = code;
        return this as any;
      },
      json() { return this; },
    } as any;
    let called = false;
    requireRole(['DO'])(req, res, () => { called = true; });
    expect(status).toBe(403);
    expect(called).toBe(false);
  });
});
