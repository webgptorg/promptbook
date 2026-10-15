import { createInterface } from 'node:readline';
import { ipcRequest } from '../common/ipc.js';
import { ENGINE_VERSION } from '../common/version.js';

/**
 * Stdio MCP server loaded by harnesses; it forwards tool calls to the running ptbk engine.
 *
 * Started as `node dist/engine/mcp-server.js` with `PTBK_BRIDGE_ADDRESS` and `PTBK_BRIDGE_TOKEN`.
 */

/**
 * Engine bridge address.
 */
const address = process.env.PTBK_BRIDGE_ADDRESS ?? '';

/**
 * Bridge authorization token.
 */
const token = process.env.PTBK_BRIDGE_TOKEN ?? '';

/**
 * Upper bound of one tool call (consultations may take minutes).
 */
const CALL_TIMEOUT_MS = 15 * 60_000;

/**
 * Writes one JSON-RPC message.
 */
function send(message: unknown): void {
    process.stdout.write(`${JSON.stringify(message)}\n`);
}

/**
 * Handles one JSON-RPC request.
 */
async function handle(message: { id?: number | string; method?: string; params?: Record<string, unknown> }): Promise<void> {
    const { id, method, params } = message;
    if (id === undefined) return; // notification
    try {
        switch (method) {
            case 'initialize':
                send({
                    jsonrpc: '2.0',
                    id,
                    result: {
                        protocolVersion: typeof params?.protocolVersion === 'string' ? params.protocolVersion : '2025-06-18',
                        capabilities: { tools: { listChanged: false } },
                        serverInfo: { name: 'ptbk', version: ENGINE_VERSION },
                    },
                });
                return;
            case 'ping':
                send({ jsonrpc: '2.0', id, result: {} });
                return;
            case 'tools/list': {
                const tools = await ipcRequest<unknown[]>(address, { token, op: 'list' }, 30_000);
                send({ jsonrpc: '2.0', id, result: { tools } });
                return;
            }
            case 'tools/call': {
                const result = await ipcRequest<{ text: string; isError?: boolean }>(address, { token, op: 'call', name: params?.name, arguments: params?.arguments ?? {} }, CALL_TIMEOUT_MS);
                send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: result.text }], isError: Boolean(result.isError) } });
                return;
            }
            default:
                send({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${String(method)}` } });
        }
    } catch (error) {
        send({ jsonrpc: '2.0', id, error: { code: -32000, message: `ptbk bridge unavailable: ${error instanceof Error ? error.message : String(error)}` } });
    }
}

const lines = createInterface({ input: process.stdin });
lines.on('line', (line) => {
    if (!line.trim()) return;
    let message: { id?: number | string; method?: string; params?: Record<string, unknown> };
    try {
        message = JSON.parse(line) as typeof message;
    } catch {
        send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
        return;
    }
    void handle(message);
});
lines.on('close', () => process.exit(0));
