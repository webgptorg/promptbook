import { runProcess } from '../harness-process.js';
import type { HarnessRequest, ProcessResult, ProcessProtocol, HarnessDefinition } from '../harness.js';
import type { ToolBridge } from '../team.js';

/** Execute one provider turn, with immutable agent context and actual on-demand TEAM tools. @private */
export async function runAcpWithTools(harness: HarnessDefinition, request: HarnessRequest, command: { args: string[]; input?: string; cwd: string }, bridge: ToolBridge, env: NodeJS.ProcessEnv, prompt: string): Promise<ProcessResult> {
    const args = ['--acp'];
    for (let index = 0; index < command.args.length; index++) {
        const argument = command.args[index]!;
        if (argument === '--prompt' || argument === '--output-format') { index++; continue; }
        args.push(argument);
    }
    let started = false;
    let finished = false;
    let startupFailure: string | undefined;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let sessionId: string | undefined;
    let contextTokens: number | undefined;
    const deadline = Date.now() + 15_000;
    /** Actual MCP initialize/tools/list must settle before session/prompt can be sent. */
    function gate(send: (message: unknown) => void, finish: () => void, ready: () => void): void {
        if (bridge.discovered()) { ready(); started = true; send({ jsonrpc: '2.0', id: 3, method: 'session/prompt', params: { sessionId, prompt: [{ type: 'text', text: prompt }] } }); }
        else if (Date.now() >= deadline) { startupFailure = `${harness.name} did not discover required ptbk tools before inference`; finish(); }
        else { pollTimer = setTimeout(() => gate(send, finish, ready), 50); pollTimer.unref(); }
    }
    const protocol: ProcessProtocol = {
        start: (send) => send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: 1, clientCapabilities: {}, clientInfo: { name: 'ptbk', version: '1' } } }),
        message: (message, send, finish, ready) => {
            if (message.error) { startupFailure = started ? undefined : JSON.stringify(message.error); finished = started; finish(); return `${JSON.stringify({ type: 'error', error: message.error })}\n`; }
            const result = message.result as Record<string, unknown> | undefined;
            if (message.id === 1) {
                if (result?.protocolVersion !== 1) { startupFailure = `${harness.name} does not support ACP protocol version 1`; finish(); return; }
                send({ jsonrpc: '2.0', id: 2, method: 'session/new', params: { cwd: command.cwd, mcpServers: [{ name: 'ptbk', ...bridge.stdio, env: [] }] } });
            } else if (message.id === 2) {
                if (typeof result?.sessionId !== 'string') { startupFailure = `${harness.name} returned no ACP session`; finish(); return; }
                if (request.readOnly && (result.modes as Record<string, unknown> | undefined)?.currentModeId !== 'plan') { startupFailure = `${harness.name} did not enforce read-only plan mode`; finish(); return; }
                sessionId = result.sessionId;
                gate(send, finish, ready);
                return `${JSON.stringify({ type: 'init', session_id: sessionId, model: (result.models as Record<string, unknown> | undefined)?.currentModelId })}\n`;
            } else if (message.id === 3) {
                finished = true; finish();
                return `${JSON.stringify({ type: result?.stopReason === 'end_turn' ? 'turn.completed' : 'turn.failed', stopReason: result?.stopReason, ...(contextTokens === undefined ? {} : { usage: { reported_context_tokens: contextTokens } }) })}\n`;
            }
            const params = message.params as Record<string, unknown> | undefined;
            if (message.method === 'session/request_permission' && message.id !== undefined) {
                const options = Array.isArray(params?.options) ? params.options as Array<Record<string, unknown>> : [];
                const allowed = !request.readOnly && options.find((option) => option.kind === 'allow_once');
                send({ jsonrpc: '2.0', id: message.id, result: { outcome: allowed ? { outcome: 'selected', optionId: allowed.optionId } : { outcome: 'cancelled' } } });
                return;
            }
            if (message.method && message.id !== undefined) { send({ jsonrpc: '2.0', id: message.id, error: { code: -32601, message: 'ptbk denies native filesystem, shell and delegated host operations' } }); return; }
            if (message.method === 'session/update') {
                const update = params?.update as Record<string, unknown> | undefined;
                if (update?.sessionUpdate === 'usage_update' && typeof update.used === 'number') contextTokens = update.used;
                return `${JSON.stringify({ type: 'acp.update', update })}\n`;
            }
            return;
        },
    };
    try {
        const result = await runProcess(harness.executable, args, { cwd: command.cwd, redactionPath: request.redactionPath || request.projectPath, env, protocol, signal: request.signal, onOutput: request.onOutput, timeoutMs: request.timeoutMs, maxOutputBytes: request.maxOutputBytes });
        if (startupFailure) return { ...result, spawnError: startupFailure, configurationError: !started };
        if (!finished && !result.cancelled) return { ...result, spawnError: result.spawnError || `${harness.name} ACP exited without a terminal turn outcome` };
        return result;
    } finally { if (pollTimer) clearTimeout(pollTimer); }
}

