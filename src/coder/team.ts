import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { TeamMember } from './agents.js';
import { confinePath } from './workspace.js';

/** Host-owned MCP tool. Capabilities are enforced in invoke, not in prompt text. @private */
export interface BridgeTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    invoke: (input: Record<string, unknown>) => Promise<string>;
}

/** Shared inference budget across an entire advisor tree. @private */
export interface TeamBudget { calls: number; depth: number; usage: Record<string, number>; }

/** Temporary bridge lifecycle and provider-neutral transport configuration. @private */
export interface ToolBridge {
    url: string;
    directory: string;
    stdio: { command: string; args: string[] };
    configPath: string;
    discovered: () => boolean;
    resetDiscovery: () => void;
    close: () => Promise<void>;
}

/** Run bounded JSON-RPC MCP over loopback and provide a packaged stdio forwarding client. @private */
export async function createToolBridge(projectPath: string, tools: BridgeTool[]): Promise<ToolBridge> {
    const runtime = await confinePath(projectPath, resolve(projectPath, '.promptbook/ptbk-coder'));
    await mkdir(runtime, { recursive: true });
    const directory = await mkdtemp(resolve(await confinePath(projectPath, runtime), 'bridge-'));
    const token = randomBytes(32).toString('hex');
    let initialized = false;
    let discovered = false;
    const server = createServer(async (request, response) => {
        if (request.url !== `/${token}` || !/^(127\.0\.0\.1|localhost):\d+$/.test(request.headers.host || '') || request.headers.origin) { response.writeHead(403).end(); return; }
        if (request.method === 'DELETE') { response.writeHead(200).end(); return; }
        if (request.method !== 'POST') { response.writeHead(405).end(); return; }
        let bytes = 0;
        const pieces: Buffer[] = [];
        try {
            for await (const piece of request) {
                const data = Buffer.from(piece);
                bytes += data.length;
                if (bytes > 1024 * 1024) { response.writeHead(413).end(); return; }
                pieces.push(data);
            }
            const message = JSON.parse(Buffer.concat(pieces).toString('utf8')) as { id?: number | string; method: string; params?: Record<string, unknown> };
            if (message.id === undefined) { response.writeHead(202).end(); return; }
            let result: unknown;
            if (message.method === 'initialize') { initialized = true; result = { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'ptbk-coder', version: '1' } }; }
            else if (message.method === 'ping') result = {};
            else if (message.method === 'tools/list') { if (initialized) discovered = true; result = { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema, annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false } })) }; }
            else if (message.method === 'tools/call') {
                const tool = tools.find((entry) => entry.name === message.params?.name);
                if (!tool) throw new Error(`Unknown ptbk tool: ${String(message.params?.name)}`);
                try {
                    const input = message.params?.arguments;
                    if (input !== undefined && (!input || typeof input !== 'object' || Array.isArray(input))) throw new Error('Tool arguments must be an object');
                    result = { content: [{ type: 'text', text: await tool.invoke((input || {}) as Record<string, unknown>) }] };
                } catch (error) { result = { isError: true, content: [{ type: 'text', text: (error as Error).message }] }; }
            } else {
                response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Unsupported MCP method ${message.method}` } }));
                return;
            }
            response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ jsonrpc: '2.0', id: message.id, result }));
        } catch (error) { response.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: (error as Error).message })); }
    });
    server.requestTimeout = 310_000;
    await new Promise<void>((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Cannot bind TEAM bridge');
    const url = `http://127.0.0.1:${address.port}/${token}`;
    const clientPath = resolve(directory, 'client.mjs');
    await writeFile(clientPath, `import { createInterface } from 'node:readline';\nconst url = ${JSON.stringify(url)};\nconst input = createInterface({ input: process.stdin, crlfDelay: Infinity });\nfor await (const line of input) {\n  if (!line.trim()) continue;\n  try {\n    const message = JSON.parse(line);\n    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(message) });\n    if (message.id !== undefined) {\n      if (!response.ok) throw new Error('ptbk bridge HTTP ' + response.status);\n      process.stdout.write(await response.text() + '\\n');\n    }\n  } catch (error) { process.stderr.write('ptbk bridge: ' + error.message + '\\n'); }\n}\n`, { mode: 0o600 });
    const stdio = { command: process.execPath, args: [clientPath] };
    const configPath = resolve(directory, 'mcp.json');
    await writeFile(configPath, JSON.stringify({ mcpServers: { ptbk: { ...stdio, timeout: 300_000, autoApprove: tools.map((tool) => tool.name) } } }), { mode: 0o600 });
    // Validate host bridge transport; native provider startup must separately prove discovery.
    const discovery = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
    const advertised = await discovery.json() as { result?: { tools?: unknown[] } };
    if (!discovery.ok || advertised.result?.tools?.length !== tools.length) { server.close(); await rm(directory, { recursive: true, force: true }); throw new Error('TEAM bridge discovery failed'); }
    return { url, directory, stdio, configPath, discovered: () => discovered, resetDiscovery: () => { initialized = false; discovered = false; }, close: async () => {
        server.closeAllConnections();
        await new Promise<void>((accept, reject) => server.close((error) => error ? reject(error) : accept()));
        await rm(directory, { recursive: true, force: true });
    } };
}

/** Build distinct advisor tools; only an actual tool call spends inference budget. @private */
export function advisorTools(members: TeamMember[], budget: TeamBudget, consult: (member: TeamMember, question: string, signal: AbortSignal, childBudget: TeamBudget) => Promise<{ output: string; usage?: Record<string, number> }>, signal?: AbortSignal): BridgeTool[] {
    const names = new Set<string>();
    return members.map((member) => {
        const name = `consult_${member.name.normalize('NFKD').replace(/[^A-Za-z0-9_]/g, '_')}`;
        if (names.has(name)) throw new Error(`TEAM tool names collide after normalization: ${member.name}`);
        names.add(name);
        return { name, description: `Ask advisor ${member.name} a question. The advisor follows its own Book.`, inputSchema: { type: 'object', properties: { question: { type: 'string', maxLength: 128_000 } }, required: ['question'], additionalProperties: false }, invoke: async (input) => {
            if (typeof input.question !== 'string' || !input.question.trim() || input.question.length > 128_000) throw new Error('TEAM question must contain 1–128000 characters');
            if (signal?.aborted) throw new Error('TEAM consultation cancelled');
            if (budget.depth >= 4) throw new Error('TEAM maximum depth (4) reached');
            if (budget.calls >= 24) throw new Error('TEAM maximum consultation count (24) reached');
            budget.calls++;
            const timer = AbortSignal.timeout(300_000);
            const consultationSignal = signal ? AbortSignal.any([signal, timer]) : timer;
            const childBudget: TeamBudget = { get calls() { return budget.calls; }, set calls(value) { budget.calls = value; }, depth: budget.depth + 1, usage: budget.usage };
            const result = await consult(member, input.question, consultationSignal, childBudget);
            // Inference owner accounts for its own usage exactly once.
            return `[Advisor: ${member.name}]\n${result.output.slice(0, 128_000)}${result.output.length > 128_000 ? '\n[Advisor response truncated at 128000 characters]' : ''}`;
        } };
    });
}
