import { getZeroTrustEnabled } from '@tactix/feature-flags/zeroTrustFlag';
import type { Request, Response, NextFunction } from 'express';

export async function zeroTrustGate(req: Request, res: Response, next: NextFunction) {
  try {
    const zt = await getZeroTrustEnabled();
    const standard = (req.app.get('authStandardChain') as any) || ((r: any, s: any, n: any) => n());
    const strict = (req.app.get('authStrictChain') as any) || standard;
    return zt ? strict(req, res, next) : standard(req, res, next);
  } catch (e) {
    req.app?.get?.('logger')?.warn?.({ err: e }, 'ZT flag resolve failed; using standard chain');
    const standard = (req.app.get('authStandardChain') as any) || ((r: any, s: any, n: any) => n());
    return standard(req, res, next);
  }
}
