"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logWarlog = logWarlog;
async function logWarlog(author, content) {
    const url = process.env.WARLOG_URL;
    if (!url)
        return;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ author, content })
        });
    }
    catch (_) {
        /* ignore */
    }
}
