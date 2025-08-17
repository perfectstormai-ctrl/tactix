"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.draftMessageHandler = draftMessageHandler;
exports.submitMessageHandler = submitMessageHandler;
const messages_js_1 = require("../../incidents/messages.js");
async function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => (data += chunk));
        req.on('end', () => {
            try {
                resolve(data ? JSON.parse(data) : {});
            }
            catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}
function json(res, code, body) {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
}
async function draftMessageHandler(req, res, incidentId, client) {
    const body = await readBody(req).catch(() => null);
    if (!body || !body.content) {
        return json(res, 400, { error: 'content required' });
    }
    const msg = await (0, messages_js_1.saveDraft)(client, incidentId, body.content, req.user.sub);
    return json(res, 201, msg);
}
async function submitMessageHandler(req, res, incidentId, client) {
    const body = await readBody(req).catch(() => null);
    const messageId = body?.messageId;
    if (!messageId) {
        return json(res, 400, { error: 'messageId required' });
    }
    const msg = await (0, messages_js_1.submitMessage)(client, incidentId, messageId);
    if (!msg)
        return json(res, 404, {});
    return json(res, 200, msg);
}
