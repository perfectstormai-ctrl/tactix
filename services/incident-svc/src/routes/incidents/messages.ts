import http from 'node:http';
type Client = any;
type AuthenticatedRequest = any;
import { saveDraft, submitMessage } from '../../incidents/messages.js';

async function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function json(res: http.ServerResponse, code: number, body: any) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

export async function draftMessageHandler(
  req: AuthenticatedRequest,
  res: http.ServerResponse,
  incidentId: number,
  client: Client
) {
  const body = await readBody(req).catch(() => null);
  if (!body || !body.content) {
    return json(res, 400, { error: 'content required' });
  }
  const msg = await saveDraft(client, incidentId, body.content, req.user!.sub);
  return json(res, 201, msg);
}

export async function submitMessageHandler(
  req: AuthenticatedRequest,
  res: http.ServerResponse,
  incidentId: number,
  client: Client
) {
  const body = await readBody(req).catch(() => null);
  const messageId = body?.messageId;
  if (!messageId) {
    return json(res, 400, { error: 'messageId required' });
  }
  const msg = await submitMessage(client, incidentId, messageId);
  if (!msg) return json(res, 404, {});
  return json(res, 200, msg);
}
