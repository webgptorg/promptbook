import { randomUUID } from 'node:crypto';
import { runProcess } from '../../harness-process.js';
import type { HarnessRequest, ProcessResult, ProcessProtocol, HarnessDefinition } from '../../harness.js';
import type { BridgeTool, ToolBridge } from '../../team.js';
import { createHarnessPlugin, invocationContext } from '../shared.js';
import type { InvocationInput, NativeInspection, NativeInspectionContext } from '../contract.js';

/** Native integration metadata and global distribution. @private */
const definition: HarnessDefinition = {
    name: 'github-copilot',
    executable: 'copilot',
    install: 'npm install --global @github/copilot',
    login: 'copilot login',
    thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    nativeDefault: true,
    toolDiscovery: 'copilot-rpc',
    readOnlyTools: true,
    documentation: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
    id: 'github-copilot',
    displayName: 'GitHub Copilot',
    featured: false,
    packageName: '@github/copilot',
    apiKeyEnvironment: 'COPILOT_PROVIDER_API_KEY',
    loginArgs: ['login'],
    helpArgs: ['--help'],
};

/** Query Copilot's native account/model metadata without creating or sending a model session. */
async function copilotMetadata(projectPath: string, signal?: AbortSignal, env?: NodeJS.ProcessEnv): Promise<{ authenticated: boolean; authentication: NativeInspection['authentication']; models: string[]; thinkingLevels: string[] }> {
    const metadata: { authenticated: boolean; authentication: NativeInspection['authentication']; models: string[]; thinkingLevels: string[] } = { authenticated: false, authentication: 'unknown', models: [], thinkingLevels: [] };
    const result = await runProcess('copilot', ['--headless', '--stdio', '--no-auto-update', '--disable-builtin-mcps', '--no-custom-instructions', '--no-bash-env'], {
        cwd: projectPath, env, signal, timeoutMs: 15_000,
        protocol: {
            framing: 'content-length',
            start(send) { send({ jsonrpc: '2.0', id: 1, method: 'connect', params: { clientInfo: { extensionName: 'ptbk-inventory', extensionVersion: '1' } } }); },
            message(message, send, finish, ready) {
                if (message.error) { finish(); return; }
                if (message.id === 1) { ready(); send({ jsonrpc: '2.0', id: 2, method: 'auth.getStatus', params: {} }); }
                else if (message.id === 2) {
                    const auth = message.result as { isAuthenticated?: boolean; authType?: string } | undefined;
                    metadata.authenticated = auth?.isAuthenticated === true;
                    metadata.authentication = metadata.authenticated ? auth?.authType === 'api-key' ? 'api' : 'account' : 'none';
                    if (metadata.authenticated) send({ jsonrpc: '2.0', id: 3, method: 'models.list', params: {} }); else finish();
                } else if (message.id === 3) {
                    const result = message.result as { models?: Array<{ id?: string; policy?: { state?: string }; supportedReasoningEfforts?: string[] }> } | undefined;
                    for (const model of result?.models || []) if (typeof model.id === 'string' && model.policy?.state !== 'disabled') { metadata.models.push(model.id); metadata.thinkingLevels.push(...model.supportedReasoningEfforts || []); }
                    metadata.thinkingLevels = [...new Set(metadata.thinkingLevels)];
                    finish();
                }
                return undefined;
            },
        },
    });
    return result.exitCode === 0 && !result.spawnError ? metadata : { authenticated: false, authentication: 'unknown', models: [], thinkingLevels: [] };
}

/** Inspect only native login/configuration and model metadata; never run inference. */
async function inspectNative(base: NativeInspection, { projectPath, signal, env }: NativeInspectionContext): Promise<void> {
    const options = { signal };
    const status = await copilotMetadata(projectPath, options.signal, env);
    base.authenticated = status.authenticated; base.authentication = status.authentication; base.models = status.models;
    if (status.thinkingLevels.length) base.thinkingLevels = status.thinkingLevels;
}

/** Construct this integration's autonomous argv and transient configuration. */
async function prepare(input: InvocationInput) {
    const { request, prompt, bridge } = input;
    const { model, thinking, requireFlag } = invocationContext(definition, input);
    const args: string[] = [];
    const cwd = request.projectPath;
    if (bridge) {
        // The official SDK transport options are hidden from public help; the versioned connect handshake validates them before inference.
        args.push('--headless', '--stdio');
        for (const flag of ['--no-auto-update', '--disable-builtin-mcps', '--no-custom-instructions', '--no-bash-env']) { requireFlag(flag); args.push(flag); }
        return { args, cwd, input: prompt };
    }
    args.push('--prompt', prompt, '--allow-all-tools');
    if (model) args.push('--model', model);
    if (thinking) { requireFlag('--reasoning-effort'); args.push('--reasoning-effort', thinking); }
    return { args, cwd };
}

/** Copilot's native SDK transport gates generation on live MCP discovery and source-qualified tool permissions. @private */
async function runCopilotWithTools(request: HarnessRequest, command: { args: string[]; input?: string; cwd: string }, bridge: ToolBridge, tools: BridgeTool[], env: NodeJS.ProcessEnv): Promise<ProcessResult> {
    const sessionId = randomUUID();
    const expected = tools.map((tool) => tool.name);
    let started = false;
    let finished = false;
    let startupFailure: string | undefined;
    let permissionId = 100;
    let reportedUsage: Record<string, number> = {};
    /** End startup without submitting any prompt if native isolation or discovery fails. */
    function refuse(message: string, finish: () => void): string { startupFailure = message; finish(); return `${JSON.stringify({ type: 'error', message })}\n`; }
    const protocol: ProcessProtocol = {
        framing: 'content-length',
        start: (send) => send({ jsonrpc: '2.0', id: 1, method: 'connect', params: { clientInfo: { extensionName: 'ptbk', extensionVersion: '1' } } }),
        message: (message, send, finish, ready) => {
            if (message.error) return refuse(`Copilot ${started ? 'turn' : 'startup'} failed: ${JSON.stringify(message.error)}`, finish);
            const result = message.result as Record<string, unknown> | undefined;
            if (message.id === 1) {
                if (result?.protocolVersion !== 3) return refuse('Copilot does not support SDK protocol version 3; no model call was made.', finish);
                const model = request.model && request.model !== 'default' ? request.model : undefined;
                send({ jsonrpc: '2.0', id: 2, method: 'session.create', params: {
                    sessionId, workingDirectory: command.cwd, streaming: true, requestPermission: true,
                    enableConfigDiscovery: false, customAgentsLocalOnly: true,
                    mcpServers: { ptbk: { type: 'local', ...bridge.stdio, tools: ['*'], deferTools: 'never', disableToolCache: true } },
                    ...(model ? { model } : {}), ...(request.thinkingLevel ? { reasoningEffort: request.thinkingLevel } : {}),
                    ...(request.readOnly ? {
                        availableTools: expected.map((name) => `mcp:ptbk-${name}`),
                        enableFileHooks: false, enableHostGitOperations: false, enableSessionStore: false, enableSkills: false,
                        enableOnDemandInstructionDiscovery: false, memory: { enabled: false }, skipEmbeddingRetrieval: true, mcpOAuthTokenStorage: 'in-memory',
                    } : {}),
                } });
            } else if (message.id === 2) {
                if (result?.sessionId !== sessionId) return refuse('Copilot did not establish the requested isolated session; no model call was made.', finish);
                send({ jsonrpc: '2.0', id: 3, method: 'session.mcp.list', params: { sessionId } });
            } else if (message.id === 3) {
                const servers = result?.servers;
                if (!Array.isArray(servers) || !(servers as Array<Record<string, unknown>>).some((server) => server.name === 'ptbk' && server.status === 'connected')) return refuse('Copilot did not connect the required ptbk MCP server; no model call was made.', finish);
                if (request.readOnly && (servers as Array<Record<string, unknown>>).some((server) => server.name !== 'ptbk' && server.status === 'connected')) return refuse('Copilot exposed external tools to a read-only advisor; no model call was made.', finish);
                send({ jsonrpc: '2.0', id: 4, method: 'session.mcp.listTools', params: { sessionId, serverName: 'ptbk' } });
            } else if (message.id === 4) {
                const available = Array.isArray(result?.tools) ? (result.tools as Array<Record<string, unknown>>).map((tool) => tool.name) : [];
                if (!bridge.discovered() || expected.some((name) => !available.includes(name))) return refuse('Copilot did not discover all required ptbk tools; no model call was made.', finish);
                ready(); started = true;
                send({ jsonrpc: '2.0', id: 5, method: 'session.send', params: { sessionId, prompt: command.input || request.prompt } });
                return `${JSON.stringify({ type: 'init', session_id: sessionId })}\n`;
            }
            if (message.method && message.id !== undefined) { send({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'ptbk denies provider-initiated host operations' } }); return; }
            const params = message.params as Record<string, unknown> | undefined;
            if (message.method !== 'session.event' || params?.sessionId !== sessionId) return;
            const event = params.event as Record<string, unknown> | undefined;
            const data = event?.data as Record<string, unknown> | undefined;
            if (event?.type === 'permission.requested') {
                const permission = data?.permissionRequest as Record<string, unknown> | undefined;
                const toolName = typeof permission?.toolName === 'string' ? permission.toolName : '';
                const allowed = !request.readOnly || (permission?.kind === 'mcp' && permission.serverName === 'ptbk' && expected.some((name) => toolName === name || toolName === `ptbk-${name}`));
                send({ jsonrpc: '2.0', id: ++permissionId, method: 'session.permissions.handlePendingPermissionRequest', params: { sessionId, requestId: data?.requestId, result: { kind: allowed ? 'approved' : 'denied-interactively-by-user' } } });
                return;
            }
            if (event?.type === 'assistant.usage' && data) for (const name of ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens', 'cost']) if (typeof data[name] === 'number') reportedUsage[name] = (reportedUsage[name] || 0) + data[name];
            if (event?.type === 'session.error') { finished = true; finish(); return `${JSON.stringify({ type: 'turn.failed', error: data })}\n`; }
            if (event?.type === 'session.idle' && !event.agentId && started) { finished = true; finish(); return `${JSON.stringify({ type: data?.aborted ? 'turn.failed' : 'turn.completed', ...(Object.keys(reportedUsage).length ? { usage: reportedUsage } : {}) })}\n`; }
            return event ? `${JSON.stringify(event)}\n` : undefined;
        },
    };
    const result = await runProcess('copilot', command.args, { cwd: command.cwd, redactionPath: request.redactionPath || request.projectPath, env, protocol, signal: request.signal, onOutput: request.onOutput, timeoutMs: request.timeoutMs, maxOutputBytes: request.maxOutputBytes });
    if (startupFailure) return { ...result, spawnError: startupFailure, configurationError: !started };
    if (!finished && !result.cancelled) return { ...result, spawnError: result.spawnError || 'Copilot exited without a terminal session outcome' };
    return result;
}

/** Common contract implemented by the GitHub Copilot integration. @private */
export const plugin = createHarnessPlugin(definition, { inspectNative, prepare, executeWithTools: ({ request, command, bridge, tools, env }) => runCopilotWithTools(request, command, bridge, tools, env) });
