import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runProcess } from '../../harness-process.js';
import type { HarnessRequest, ProcessResult, ProcessProtocol, HarnessDefinition } from '../../harness.js';
import { confinePath } from '../../workspace.js';
import type { BridgeTool, ToolBridge } from '../../team.js';
import { createHarnessPlugin, invocationContext } from '../shared.js';
import type { InvocationInput, NativeInspection, NativeInspectionContext } from '../contract.js';

/** Native integration metadata and global distribution. @private */
const definition: HarnessDefinition = {
    name: 'openai-codex',
    executable: 'codex',
    install: 'npm install --global @openai/codex',
    login: 'codex login',
    thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    defaultThinking: 'xhigh',
    nativeDefault: true,
    toolDiscovery: 'codex-app-server',
    readOnlyTools: true,
    documentation: 'https://learn.chatgpt.com/docs/app-server',
    id: 'openai-codex',
    displayName: 'OpenAI Codex',
    featured: true,
    packageName: '@openai/codex',
    apiKeyEnvironment: 'OPENAI_API_KEY',
    loginArgs: ['login'],
    helpArgs: ['exec', '--help'],
};

/** Fetch an installed Codex model catalog over metadata RPC, without starting any thread or turn. */
async function codexCatalog(projectPath: string, signal?: AbortSignal, env?: NodeJS.ProcessEnv): Promise<string[]> {
    const models: string[] = [];
    let cursor: string | undefined;
    const result = await runProcess('codex', ['app-server', '--listen', 'stdio://'], {
        cwd: projectPath, env, signal, timeoutMs: 15_000,
        protocol: {
            start(send) { send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { clientInfo: { name: 'ptbk-inventory', version: '1' }, capabilities: { experimentalApi: true } } }); },
            message(message, send, finish, ready) {
                if (message.id === 1) {
                    if (message.error) { finish(); return; }
                    ready(); send({ jsonrpc: '2.0', method: 'initialized' });
                    send({ jsonrpc: '2.0', id: 2, method: 'model/list', params: { limit: 100, includeHidden: false } });
                } else if (message.id === 2) {
                    const result = message.result as { data?: Array<{ model?: string; id?: string }>; nextCursor?: string } | undefined;
                    for (const model of result?.data || []) if (model.model || model.id) models.push((model.model || model.id)!);
                    if (result?.nextCursor && result.nextCursor !== cursor && models.length < 1000) {
                        cursor = result.nextCursor;
                        send({ jsonrpc: '2.0', id: 2, method: 'model/list', params: { limit: 100, cursor, includeHidden: false } });
                    } else finish();
                }
                return undefined;
            },
        },
    });
    return result.exitCode === 0 && !result.spawnError ? [...new Set(models)] : [];
}

/** Inspect only native login/configuration and model metadata; never run inference. */
async function inspectNative(base: NativeInspection, { projectPath, signal, env: configuredEnvironment }: NativeInspectionContext): Promise<void> {
    const options = { signal };
    const harness = definition;
    const env = { ...configuredEnvironment }; delete env.OPENAI_API_KEY; delete env.CODEX_API_KEY;
    const status = await runProcess(harness.executable, ['login', 'status'], { cwd: projectPath, env, signal: options.signal, timeoutMs: 10_000 });
    if (status.exitCode === 0 && /logged in using ChatGPT|chatgpt_auth_tokens|"authMode"\s*:\s*"chatgpt"/i.test(status.output)) { base.authenticated = true; base.authentication = 'account'; }
    else if (configuredEnvironment.PTBK_OPENAI_CODEX_USE_API_KEY === '1' && (configuredEnvironment.OPENAI_API_KEY || configuredEnvironment.CODEX_API_KEY)) { base.authenticated = true; base.authentication = 'api'; }
    base.models = await codexCatalog(projectPath, options.signal, configuredEnvironment);
}

/** Construct this integration's autonomous argv and transient configuration. */
async function prepare(input: InvocationInput) {
    const { request, prompt, help, bridge, authentication } = input;
    const { model, thinking, requireFlag } = invocationContext(definition, input);
    const args: string[] = [];
    let cwd = request.projectPath;
    let cleanup: (() => Promise<void>) | undefined;
    requireFlag('--json'); requireFlag('--sandbox');
    args.push('exec', '--json', '--color', 'never', '--sandbox', request.readOnly ? 'read-only' : 'workspace-write', '-c', 'approval_policy="never"');
    // forced_login_method controls authentication, not purchased ChatGPT credits.
    // Require an explicit provider-enforced credit prohibition instead of inventing a config key.
    args.push('-c', authentication === 'api' ? 'forced_login_method="api"' : 'forced_login_method="chatgpt"');
    if (authentication === 'account' && !request.allowCredits) {
        if (help.includes('--no-credits')) args.push('--no-credits');
        else if (help.includes('--disable-credits')) args.push('--disable-credits');
        else throw new Error('The installed Codex CLI cannot enforce credit-free account execution. No model call was made. Use --allow-credits only if you authorize account credits, or select a harness with an enforceable credit policy. API billing remains a separate explicit opt-in.');
    }
    if (request.readOnly) {
        requireFlag('--ignore-user-config'); requireFlag('--ignore-rules'); requireFlag('--disable');
        args.push('--ignore-user-config', '--ignore-rules', '--skip-git-repo-check', '--ephemeral');
        for (const feature of ['shell_tool', 'unified_exec', 'hooks', 'plugins', 'apps', 'multi_agent', 'computer_use', 'browser_use', 'image_generation', 'view_image']) args.push('--disable', feature);
        args.push('-c', 'web_search="disabled"', '-c', 'project_root_markers=[]', '-c', 'project_doc_max_bytes=0');
        const runtime = await confinePath(request.projectPath, resolve(request.projectPath, '.ptbk'));
        await mkdir(runtime, { recursive: true });
        cwd = await mkdtemp(resolve(await confinePath(request.projectPath, runtime), 'planner-'));
        cleanup = () => rm(cwd, { recursive: true, force: true });
    }
    if (model) args.push('--model', model);
    if (thinking) args.push('-c', `model_reasoning_effort=${JSON.stringify(thinking)}`);
    if (bridge) args.push('-c', `mcp_servers.ptbk.command=${JSON.stringify(bridge.stdio.command)}`, '-c', `mcp_servers.ptbk.args=${JSON.stringify(bridge.stdio.args)}`, '-c', 'mcp_servers.ptbk.required=true', '-c', 'mcp_servers.ptbk.tool_timeout_sec=300');
    args.push('-');
    return { args, input: prompt, cwd, cleanup };
}

/** Enforce account preference and require explicit API billing opt-in. @private */
async function codexAuthentication(request: HarnessRequest, env: NodeJS.ProcessEnv): Promise<'account' | 'api'> {
    const probeEnvironment = { ...env };
    delete probeEnvironment.OPENAI_API_KEY; delete probeEnvironment.CODEX_API_KEY;
    const status = await runProcess('codex', ['login', 'status'], { cwd: request.projectPath, env: probeEnvironment, signal: request.signal, timeoutMs: 15_000 });
    if (status.exitCode === 0 && /Logged in using ChatGPT|chatgpt_auth_tokens|"authMode"\s*:\s*"chatgpt"/i.test(status.output)) { delete env.OPENAI_API_KEY; delete env.CODEX_API_KEY; delete env.OPENAI_BASE_URL; return 'account'; }
    if (process.env.PTBK_OPENAI_CODEX_USE_API_KEY === '1' && (env.OPENAI_API_KEY || env.CODEX_API_KEY)) {
        env.CODEX_API_KEY = env.CODEX_API_KEY || env.OPENAI_API_KEY;
        return 'api';
    }
    throw new Error('OpenAI Codex authentication required: run codex login. API billing requires PTBK_OPENAI_CODEX_USE_API_KEY=1 and OPENAI_API_KEY, and is never an automatic fallback.');
}

/** Gate Codex generation behind its native thread startup and actual tool catalog. @private */
async function runCodexWithTools(request: HarnessRequest, command: { args: string[]; input?: string; cwd: string }, bridge: ToolBridge, tools: BridgeTool[], env: NodeJS.ProcessEnv): Promise<ProcessResult> {
    const help = await runProcess('codex', ['app-server', '--help'], { cwd: command.cwd, env, signal: request.signal, timeoutMs: 15_000 });
    if (help.exitCode !== 0 || !help.output.includes('--strict-config')) throw new Error('Installed Codex lacks the required app-server tool discovery protocol. Update Codex before using TEAM or planning.');
    const args = ['app-server', '--strict-config', '-c', 'project_root_markers=[]'];
    for (let index = 0; index < command.args.length; index++) {
        const argument = command.args[index]!;
        if (argument === '-c' || argument === '--disable') args.push(argument, command.args[++index]!);
        else if (argument === '--no-credits' || argument === '--disable-credits') {
            if (!help.output.includes(argument)) throw new Error('Codex app-server cannot enforce the requested credit prohibition; explicit --allow-credits is required for TEAM/planning. No model call was made.');
            args.push(argument);
        }
    }
    let threadId: string | undefined;
    let started = false;
    let finished = false;
    let startupFailure: string | undefined;
    let usage: Record<string, number> | undefined;
    let effectiveModel: string | undefined;
    const catalog: Array<Record<string, unknown>> = [];
    const expected = tools.map((tool) => tool.name);
    let pages = 0;
    /** Configuration errors end transport without starting an inference. */
    function failure(message: string, finish: () => void): string {
        startupFailure = message; finish();
        return `${JSON.stringify({ type: 'error', message })}\n`;
    }
    const protocol: ProcessProtocol = {
        start: (send) => send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'ptbk', title: 'Promptbook coder', version: '1' } } }),
        message: (message, send, finish, ready) => {
            if (message.error) return failure(`Codex ${started ? 'turn' : 'startup'} failed: ${JSON.stringify(message.error)}`, finish);
            const result = message.result as Record<string, unknown> | undefined;
            if (message.id === 1) {
                send({ method: 'initialized', params: {} });
                send({ id: 2, method: 'config/read', params: { includeLayers: false } });
            } else if (message.id === 2) {
                const configuration = result?.config as Record<string, unknown> | undefined;
                if (!configuration || typeof configuration !== 'object') return failure('Codex did not return an effective configuration; no model call was made.', finish);
                if (request.readOnly) {
                    const features = configuration.features as Record<string, unknown> | undefined;
                    const requiredDisabled = ['shell_tool', 'unified_exec', 'hooks', 'plugins', 'apps', 'multi_agent', 'computer_use', 'browser_use', 'image_generation', 'view_image'];
                    if (!features || requiredDisabled.some((name) => features[name] !== false)) return failure('Codex configuration did not enforce disabled native shell, write-capable integrations and delegation. No model call was made.', finish);
                }
                const servers = configuration.mcp_servers;
                if (servers !== undefined && (!servers || typeof servers !== 'object' || Array.isArray(servers))) return failure('Codex returned an invalid MCP configuration; no model call was made.', finish);
                const overrides: Record<string, unknown> = { project_root_markers: [], mcp_servers: { ptbk: { ...bridge.stdio, required: true, tool_timeout_sec: 300 } } };
                if (request.readOnly) {
                    const disabled = Object.fromEntries(Object.keys((servers || {}) as object).filter((name) => name !== 'ptbk').map((name) => [name, { enabled: false }]));
                    overrides.mcp_servers = { ...disabled, ptbk: { ...bridge.stdio, required: true, tool_timeout_sec: 300 } };
                    overrides.project_doc_max_bytes = 0;
                }
                const model = request.model && request.model !== 'default' ? request.model : undefined;
                send({ id: 3, method: 'thread/start', params: { cwd: command.cwd, ephemeral: true, approvalPolicy: 'never', sandbox: request.readOnly ? 'read-only' : 'workspace-write', ...(model ? { model } : {}), config: overrides } });
            } else if (message.id === 3) {
                const thread = result?.thread as Record<string, unknown> | undefined;
                if (typeof thread?.id !== 'string') return failure('Codex thread startup returned no thread identifier; no model call was made.', finish);
                if (request.readOnly && ((result?.sandbox as Record<string, unknown> | undefined)?.type !== 'readOnly' || result?.approvalPolicy !== 'never')) return failure('Codex did not enforce read-only sandbox and approval policy; no model call was made.', finish);
                threadId = thread.id;
                if (typeof result?.model === 'string') effectiveModel = result.model;
                send({ id: 4, method: 'mcpServerStatus/list', params: { threadId, detail: 'toolsAndAuthOnly', limit: 100 } });
            } else if (message.id === 4) {
                if (!Array.isArray(result?.data)) return failure('Codex tool discovery returned no catalog; no model call was made.', finish);
                catalog.push(...result.data as Array<Record<string, unknown>>);
                if (result.nextCursor) {
                    if (++pages > 64 || typeof result.nextCursor !== 'string') return failure('Codex tool catalog pagination exceeded its limit; no model call was made.', finish);
                    send({ id: 4, method: 'mcpServerStatus/list', params: { threadId, detail: 'toolsAndAuthOnly', limit: 100, cursor: result.nextCursor } });
                    return;
                }
                const server = catalog.find((entry) => entry.name === 'ptbk');
                const available = server?.tools && typeof server.tools === 'object' ? Object.keys(server.tools) : [];
                if (!bridge.discovered() || !server || server.toolsError || expected.some((name) => !available.includes(name))) return failure('Codex did not discover all required ptbk tools; no model call was made.', finish);
                if (request.readOnly && catalog.some((entry) => entry.name !== 'ptbk' && entry.tools && Object.keys(entry.tools as object).length)) return failure('Codex exposed external tools in read-only planning; no model call was made.', finish);
                ready(); started = true;
                send({ id: 5, method: 'turn/start', params: { threadId, input: [{ type: 'text', text: command.input || request.prompt }] } });
                return `${JSON.stringify({ type: 'thread.started', thread_id: threadId, ...(effectiveModel ? { model: effectiveModel } : {}) })}\n`;
            }
            const params = message.params as Record<string, unknown> | undefined;
            if (message.method === 'thread/tokenUsage/updated') {
                const reported = (params?.tokenUsage as Record<string, unknown> | undefined)?.total;
                if (reported && typeof reported === 'object') usage = Object.fromEntries(Object.entries(reported).filter(([, value]) => typeof value === 'number')) as Record<string, number>;
                return;
            }
            if (message.method === 'turn/completed') {
                const turn = params?.turn as Record<string, unknown> | undefined;
                finished = true; finish();
                return `${JSON.stringify({ type: turn?.status === 'completed' ? 'turn.completed' : 'turn.failed', ...(usage ? { usage } : {}), ...(turn?.error ? { error: turn.error } : {}) })}\n`;
            }
            if (message.method && message.id !== undefined) {
                // Approval, shell, elicitation and permission requests are never delegated to a human or another tool.
                send({ id: message.id, error: { code: -32601, message: 'ptbk denies provider-initiated host operations' } });
                return;
            }
            if (message.method === 'item/completed' && params?.item) return `${JSON.stringify({ type: 'item.completed', item: params.item })}\n`;
            if (message.method === 'item/agentMessage/delta') return `${JSON.stringify({ type: 'item.delta', delta: params?.delta })}\n`;
            if (message.method === 'error') return `${JSON.stringify({ type: 'error', ...params })}\n`;
            return;
        },
    };
    const result = await runProcess('codex', args, { cwd: command.cwd, redactionPath: request.redactionPath || request.projectPath, env, protocol, signal: request.signal, onOutput: request.onOutput, timeoutMs: request.timeoutMs, maxOutputBytes: request.maxOutputBytes });
    if (startupFailure) return { ...result, spawnError: startupFailure, configurationError: !started };
    if (!finished && !result.cancelled) return { ...result, spawnError: result.spawnError || 'Codex app-server exited without a terminal turn outcome' };
    return result;
}

/** Common contract implemented by the OpenAI Codex integration. @private */
export const plugin = createHarnessPlugin(definition, { inspectNative, prepare, authenticate: codexAuthentication, executeWithTools: ({ request, command, bridge, tools, env }) => runCodexWithTools(request, command, bridge, tools, env) });
