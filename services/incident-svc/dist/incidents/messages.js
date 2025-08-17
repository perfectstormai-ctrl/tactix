"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDraft = saveDraft;
exports.submitMessage = submitMessage;
const node_crypto_1 = require("node:crypto");
const warlog_js_1 = require("../warlog.js");
async function saveDraft(client, incidentId, content, author) {
    const { rows } = await client.query('INSERT INTO messages (id, incident_id, author, content, status) VALUES ($1,$2,$3,$4,$5) RETURNING *', [(0, node_crypto_1.randomUUID)(), incidentId, author, content, 'draft']);
    return rows[0];
}
async function submitMessage(client, incidentId, messageId) {
    const { rows } = await client.query('UPDATE messages SET status=$1 WHERE id=$2 AND incident_id=$3 RETURNING *', ['submitted', messageId, incidentId]);
    const msg = rows[0];
    if (msg) {
        try {
            await (0, warlog_js_1.logWarlog)(msg.author, msg.content);
        }
        catch (_) { }
    }
    return msg || null;
}
