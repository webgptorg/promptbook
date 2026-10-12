import { runProcess } from '../../harness-process.js';
import type { HarnessRequest, ProcessResult, ProcessProtocol, HarnessDefinition } from '../../harness.js';
import type { BridgeTool, ToolBridge } from '../../team.js';
import { createHarnessPlugin, invocationContext } from '../shared.js';
import type { InvocationInput, NativeInspection, NativeInspectionContext } from '../contract.js';

/** Native integration metadata and global distribution. @private */
const definition: HarnessDefinition = {
    name: 'claude-code',
    executable: 'claude',
    install: 'npm install --global @anthropic-ai/claude-code',
    login: 'claude auth login',
    thinkingLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    nativeDefault: true,
    toolDiscovery: 'claude-control',
    readOnlyTools: true,
    documentation: 'https://code.claude.com/docs/en/cli-reference',
    id: 'claude-code',
    displayName: 'Claude Code',
    featured: true,
    packageName: '@anthropic-ai/claude-code',
    apiKeyEnvironment: 'ANTHROPIC_API_KEY',
    loginArgs: ['auth', 'login'],
    helpArgs: ['--help'],
};

/** Inspect only native login/configuration and model metadata; never run inference. */
async function inspectNative(base: NativeInspection, { probe }: NativeInspectionContext): Promise<void> {
    const status = await probe(['auth', 'status', '--json']);
    try {
        const value = JSON.parse(status.output) as { loggedIn?: boolean; authMethod?: string; apiKeySource?: string };
        base.authenticated = status.exitCode === 0 && value.loggedIn === true;
        if (base.authenticated) base.authentication = /api/i.test(value.authMethod || value.apiKeySource || '') ? 'api' : 'account';
    } catch { base.authenticated = false; }
}

/** Construct this integration's autonomous argv and transient configuration. */
async function prepare(input: InvocationInput) {
    const { request, prompt, bridge } = input;
    const { model, thinking, requireFlag } = invocationContext(definition, input);
    const args: string[] = [];
    const cwd = request.projectPath;
    requireFlag('--output-format');
    args.push('--print', '--output-format', 'stream-json', '--verbose', '--permission-mode', request.readOnly ? 'dontAsk' : 'acceptEdits');
    if (request.readOnly) {
        requireFlag('--tools'); requireFlag('--strict-mcp-config'); requireFlag('--restricted'); requireFlag('--setting-sources'); requireFlag('--settings'); requireFlag('--disable-slash-commands');
        args.push('--tools', '', '--strict-mcp-config', '--restricted', '--setting-sources', '', '--settings', '{"disableAllHooks":true}', '--disable-slash-commands');
    }
    if (thinking) { requireFlag('--effort'); args.push('--effort', thinking); }
    if (model) args.push('--model', model);
    if (bridge) { requireFlag('--mcp-config'); requireFlag('--input-format'); requireFlag('--allowedTools'); args.push('--mcp-config', bridge.configPath, '--input-format', 'stream-json', '--allowedTools', 'mcp__ptbk__*'); }
    if (request.sessionId) args.push('--resume', request.sessionId);
    return { args, input: prompt, cwd };
}

/** Claude's SDK control protocol discovers MCP tools while the user-message stream is empty. @private */
async function runClaudeWithTools(request: HarnessRequest, command: { args: string[]; input?: string; cwd: string }, bridge: ToolBridge, tools: BridgeTool[], env: NodeJS.ProcessEnv): Promise<ProcessResult> {
    let started = false;
    let finished = false;
    let failure: string | undefined;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + 15_000;
    const expected = tools.map((tool) => tool.name);
    /** Refuse startup without submitting a user message or spending inference. */
    function refuse(message: string, finish: () => void): string { failure = message; finish(); return `${JSON.stringify({ type: 'error', message })}\n`; }
    const protocol: ProcessProtocol = {
        start: (send) => send({ type: 'control_request', request_id: 'ptbk_initialize', request: { subtype: 'initialize', hooks: null } }),
        message: (message, send, finish, ready) => {
            if (message.type === 'control_response') {
                const response = message.response as Record<string, unknown> | undefined;
                if (response?.subtype !== 'success') return refuse(`Claude startup control failed: ${JSON.stringify(response)}. No model call was made.`, finish);
                if (response.request_id === 'ptbk_initialize') send({ type: 'control_request', request_id: 'ptbk_mcp_status', request: { subtype: 'mcp_status' } });
                else if (response.request_id === 'ptbk_mcp_status') {
                    const data = response.response as Record<string, unknown> | undefined;
                    const servers = data?.mcpServers;
                    if (!Array.isArray(servers)) return refuse('Claude did not provide a native MCP catalog. No model call was made.', finish);
                    const server = (servers as Array<Record<string, unknown>>).find((entry) => entry.name === 'ptbk');
                    if (server?.status === 'pending' || server?.status === 'connecting') {
                        if (Date.now() >= deadline) return refuse('Claude MCP startup exceeded 15 seconds. No model call was made.', finish);
                        pollTimer = setTimeout(() => send({ type: 'control_request', request_id: 'ptbk_mcp_status', request: { subtype: 'mcp_status' } }), 100); pollTimer.unref();
                        return;
                    }
                    const available = Array.isArray(server?.tools) ? (server.tools as Array<Record<string, unknown>>).map((tool) => tool.name) : [];
                    if (server?.status !== 'connected' || !bridge.discovered() || expected.some((name) => !available.includes(name))) return refuse('Claude did not discover all required ptbk tools. No model call was made.', finish);
                    if (request.readOnly && (servers as Array<Record<string, unknown>>).some((entry) => entry.name !== 'ptbk' && entry.status === 'connected')) return refuse('Claude exposed external tools to a read-only advisor. No model call was made.', finish);
                    ready(); started = true;
                    send({ type: 'user', session_id: '', message: { role: 'user', content: command.input || request.prompt }, parent_tool_use_id: null });
                }
                return;
            }
            if (message.type === 'control_request') {
                const control = message.request as Record<string, unknown> | undefined;
                const name = typeof control?.tool_name === 'string' ? control.tool_name : '';
                const permitted = control?.subtype === 'can_use_tool' && (!request.readOnly || expected.some((tool) => name === `mcp__ptbk__${tool}`));
                send({ type: 'control_response', response: { subtype: 'success', request_id: message.request_id, response: permitted ? { behavior: 'allow', updatedInput: control?.input || {} } : { behavior: 'deny', message: 'ptbk denies operations outside the selected role permissions' } } });
                return;
            }
            if (message.type === 'result') { finished = true; finish(); }
            return `${JSON.stringify(message)}\n`;
        },
    };
    try {
        const result = await runProcess('claude', command.args, { cwd: command.cwd, redactionPath: request.redactionPath || request.projectPath, env, protocol, signal: request.signal, onOutput: request.onOutput, timeoutMs: request.timeoutMs, maxOutputBytes: request.maxOutputBytes });
        if (failure) return { ...result, spawnError: failure, configurationError: !started };
        if (!finished && !result.cancelled) return { ...result, spawnError: result.spawnError || 'Claude exited without a terminal result' };
        return result;
    } finally { if (pollTimer) clearTimeout(pollTimer); }
}

/** Common contract implemented by the Claude Code integration. @private */
export const plugin = createHarnessPlugin(definition, { inspectNative, prepare, executeWithTools: ({ request, command, bridge, tools, env }) => runClaudeWithTools(request, command, bridge, tools, env) });
