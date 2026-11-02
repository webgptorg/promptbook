'use strict';
const { createServer } = require('node:net');
const { randomBytes, timingSafeEqual } = require('node:crypto');

/** Hosts only the current CLI child's presentation prompts, authenticated by a private ephemeral token. */
async function createPromptServer(onPrompt, onClosed = () => {}) {
    const token = randomBytes(32).toString('hex');
    const pending = new Map();
    const sockets = new Set();
    let nextId = 0;
    const server = createServer((socket) => {
        sockets.add(socket);
        let buffer = '';
        let handled = false;
        let id;
        socket.setEncoding('utf8');
        socket.on('error', () => {});
        socket.on('close', () => { sockets.delete(socket); if (id) { pending.delete(id); onClosed(id); } });
        socket.on('data', (chunk) => {
            if (handled) return;
            buffer += chunk;
            if (Buffer.byteLength(buffer) > 4 * 1024 * 1024) return socket.destroy();
            const end = buffer.indexOf('\n');
            if (end < 0) return;
            handled = true;
            try {
                const request = JSON.parse(buffer.slice(0, end));
                const supplied = Buffer.from(String(request.token || ''));
                const expected = Buffer.from(token);
                if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return socket.destroy();
                if (!request.prompt || !['one', 'many', 'text', 'toggles'].includes(request.prompt.kind) || typeof request.prompt.question !== 'string') return socket.destroy();
                if (pending.size) return socket.destroy();
                id = String(++nextId);
                pending.set(id, socket);
                onPrompt({ id, ...request.prompt });
            } catch { socket.destroy(); }
        });
    });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    return {
        env: { PTBK_PROMPT_PORT: String(server.address().port), PTBK_PROMPT_TOKEN: token },
        answer(id, answer) {
            const socket = pending.get(id);
            if (!socket) throw new Error('This prompt has already ended.');
            if (!answer || !['answer', 'back', 'cancel', 'terminal'].includes(answer.action) || Buffer.byteLength(JSON.stringify(answer)) > 4 * 1024 * 1024) throw new Error('Invalid prompt answer.');
            pending.delete(id);
            socket.end(`${JSON.stringify(answer)}\n`);
        },
        close() {
            for (const socket of sockets) socket.end(`${JSON.stringify({ action: 'cancel' })}\n`);
            server.close();
        },
    };
}
module.exports = { createPromptServer };
