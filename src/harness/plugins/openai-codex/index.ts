import { runProcess } from '../../../common/process.js';
import { stripAnsi } from '../../../ui/ansi.js';
import { baseInspection, helpText, numericUsage, parseJsonLine, probe, summarizeToolInput, withAuthentication } from '../../shared.js';
import type { HarnessContext, HarnessEvent, HarnessInspection, HarnessInvocation, HarnessLoginMethod, HarnessPlugin, HarnessRunRequest, LoginFailure, LoginLocation, ParserState } from '../../types.js';

/**
 * Environment variables that could switch Codex to API billing.
 */
const API_KEY_VARIABLES = ['OPENAI_API_KEY', 'CODEX_API_KEY', 'OPENAI_BASE_URL'];

/**
 * Copies an environment without API-key overrides (account sessions win over present keys).
 */
function withoutApiKeys(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    const copy = { ...env };
    for (const name of API_KEY_VARIABLES) delete copy[name];
    return copy;
}

/**
 * Formats a TOML string literal (JSON string syntax is valid TOML basic-string syntax).
 */
function toml(value: string): string {
    return JSON.stringify(value);
}

/**
 * Fetches the installed Codex model catalog over its app-server metadata RPC, without starting a thread or turn.
 */
async function listCodexModels(context: HarnessContext): Promise<string[]> {
    const models: string[] = [];
    let controls: { write: (text: string) => void; end: () => void } | undefined;
    const send = (message: unknown): void => controls?.write(`${JSON.stringify(message)}\n`);
    await runProcess('codex', ['app-server'], {
        cwd: context.projectRoot,
        env: context.env,
        timeoutMs: 10_000,
        signal: context.signal,
        stdinController: (value) => {
            controls = value;
            send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { clientInfo: { name: 'ptbk-inventory', version: '1' } } });
        },
        onStdoutLine: (line) => {
            const message = parseJsonLine(line);
            if (message?.id === 1) {
                send({ jsonrpc: '2.0', method: 'initialized' });
                send({ jsonrpc: '2.0', id: 2, method: 'model/list', params: { limit: 100 } });
            } else if (message?.id === 2) {
                const data = (message.result as { data?: Array<{ model?: string; id?: string; hidden?: boolean }> } | undefined)?.data ?? [];
                for (const entry of data) if (!entry.hidden && (entry.model || entry.id)) models.push((entry.model ?? entry.id)!);
                controls?.end();
            }
        },
    });
    return [...new Set(models)];
}

/**
 * Inspects installation and the native login (`codex login status`) of a NATIVE instance, never running inference.
 * Ambient API keys never turn a native instance into API billing; explicit `API_KEY` instances are inspected by the
 * shared instance layer.
 */
async function inspect(context: HarnessContext): Promise<HarnessInspection> {
    const { inspection, executablePath } = await baseInspection(plugin, context);
    if (!executablePath) return inspection;
    const status = await probe(context, executablePath, ['login', 'status'], withoutApiKeys(context.env));
    if (status.ok && /logged in using chatgpt/i.test(status.output)) {
        return withAuthentication(inspection, true, 'account', plugin.loginHint, `Ready (ChatGPT account login${inspection.version ? `, v${inspection.version}` : ''}).`);
    }
    if (status.ok && /api key/i.test(status.output)) {
        return {
            ...withAuthentication(inspection, false, 'none', plugin.loginHint, 'The native Codex login uses an API key; a NATIVE tool never switches to API billing.'),
            nextAction: `Sign in with ChatGPT (\`codex login\`), or add an explicit API tool: ptbk tool add HARNESS --variant OPENAI_CODEX --name codex-api --authentication API_KEY --api-key-env OPENAI_API_KEY`,
        };
    }
    return withAuthentication(inspection, false, 'none', plugin.loginHint, 'Installed but not logged in.');
}

/**
 * Local port of the browser sign-in callback (`codex login`), forwarded over SSH when the browser is on another device.
 */
const LOGIN_CALLBACK_PORT = 1455;

/**
 * Sign-in methods of the installed Codex: device-code login (`--device-auth`, when this version has it) first on a
 * remote host, the browser callback login first locally. Never an API key for a native ChatGPT login.
 */
async function loginMethods(context: HarnessContext, location: LoginLocation): Promise<HarnessLoginMethod[]> {
    const help = await helpText(context, 'codex', ['login', '--help']);
    const device: HarnessLoginMethod | undefined = help.includes('--device-auth')
        ? {
              id: 'device-code',
              label: 'Sign in on another device with a one-time code (codex login --device-auth)',
              args: ['login', '--device-auth'],
              remote: true,
              instructions:
                  'Codex shows a link and a one-time code. Open the link on your phone or computer, sign in with ChatGPT and enter the code there; this terminal continues by itself. Device-code login may first need enabling in your ChatGPT security settings, or permission from your workspace administrator.',
              terminal: 'relay',
          }
        : undefined;
    if (location === 'local') {
        const browser: HarnessLoginMethod = { id: 'browser', label: 'Sign in with ChatGPT in the browser (codex login)', args: ['login'], remote: false, instructions: 'Codex opens ChatGPT sign-in in your browser; finish it there and return to this terminal.', terminal: 'inherit' };
        return device ? [browser, device] : [browser];
    }
    const forwarding: HarnessLoginMethod = {
        id: 'callback-forwarding',
        label: 'Sign in with your computer’s browser through SSH port forwarding (codex login)',
        args: ['login'],
        remote: true,
        instructions: `${device ? '' : 'This Codex version has no device-code login (a newer version has it). '}First, in another terminal on your computer, forward the sign-in callback: ssh -N -L ${LOGIN_CALLBACK_PORT}:localhost:${LOGIN_CALLBACK_PORT} <your usual SSH login to this server>. Then open the URL Codex shows in your computer's browser and sign in with ChatGPT.`,
        terminal: 'inherit',
    };
    return device ? [device, forwarding] : [forwarding];
}

/**
 * Classifies the transient output of an unsuccessful Codex sign-in.
 */
function classifyLogin(output: string): LoginFailure | undefined {
    const plain = stripAnsi(output);
    if (/not enabled|disabled|not allowed|not permitted|administrator/i.test(plain)) {
        return { outcome: 'unsupported', diagnostic: 'Device-code login is not enabled for this ChatGPT account or workspace. Enable it in your ChatGPT security settings or ask your workspace administrator, or sign in through SSH port forwarding. An API key is never used for this native tool.' };
    }
    if (/expired|timed out|time ?out/i.test(plain)) return { outcome: 'expired', diagnostic: 'The one-time code expired before sign-in finished; start the sign-in again for a new code.' };
    if (/denied|declined|rejected/i.test(plain)) return { outcome: 'denied', diagnostic: 'Sign-in was denied on the ChatGPT page; nothing was changed.' };
    return undefined;
}

/**
 * Builds `codex exec --json` with the workspace-write (or read-only) sandbox and no approvals.
 */
async function buildInvocation(request: HarnessRunRequest): Promise<HarnessInvocation> {
    const context = { projectRoot: request.projectRoot, env: request.env };
    const execHelp = await helpText(context, 'codex', ['exec', '--help']);
    const api = request.authentication === 'api';
    const env: NodeJS.ProcessEnv = api ? { ...request.env, CODEX_API_KEY: request.env.CODEX_API_KEY ?? request.env.OPENAI_API_KEY } : withoutApiKeys(request.env);
    // A local or custom endpoint selected through the tool (the official endpoint needs no override).
    if (request.baseUrl) env.OPENAI_BASE_URL = request.baseUrl;
    const args = ['exec', '--json', '--color', 'never', '--skip-git-repo-check', '--sandbox', request.readOnly ? 'read-only' : 'workspace-write'];
    args.push('-c', 'approval_policy="never"', '-c', `forced_login_method=${toml(api ? 'api' : 'chatgpt')}`);
    if (!request.readOnly) args.push('-c', 'sandbox_workspace_write.network_access=true');
    for (const directory of request.readableDirectories) if (execHelp.includes('--add-dir') && !request.readOnly) args.push('--add-dir', directory);
    if (!api && !request.allowCredits) {
        // Apply a native credit restriction only when the installed CLI actually supports one.
        if (execHelp.includes('--no-credits')) args.push('--no-credits');
        else if (execHelp.includes('--disable-credits')) args.push('--disable-credits');
    }
    if (request.model) args.push('--model', request.model);
    if (request.thinkingLevel) args.push('-c', `model_reasoning_effort=${toml(request.thinkingLevel)}`);
    if (request.mcp) {
        const environment = Object.entries(request.mcp.env)
            .map(([key, value]) => `${key}=${toml(value)}`)
            .join(', ');
        args.push(
            '-c',
            `mcp_servers.ptbk.command=${toml(request.mcp.command)}`,
            '-c',
            `mcp_servers.ptbk.args=[${request.mcp.args.map(toml).join(', ')}]`,
            '-c',
            `mcp_servers.ptbk.env={${environment}}`,
            '-c',
            'mcp_servers.ptbk.startup_timeout_sec=30',
            '-c',
            'mcp_servers.ptbk.tool_timeout_sec=900',
            // ptbk's own tools enforce task authority themselves; per-call approval would be an invisible prompt in
            // unattended exec (Codex then rejects the call as "approval unavailable"). Older Codex ignores the key.
            '-c',
            'mcp_servers.ptbk.default_tools_approval_mode="approve"',
        );
    }
    args.push('-');
    return { args, input: request.prompt, env };
}

/**
 * Parses `codex exec --json` events.
 */
function parseLine(line: string, state: ParserState): HarnessEvent[] {
    const event = parseJsonLine(line);
    if (!event) return [];
    const events: HarnessEvent[] = [];
    const type = event.type;
    if (type === 'thread.started' && typeof event.thread_id === 'string') events.push({ type: 'session', id: event.thread_id });
    else if (type === 'item.started' || type === 'item.completed') {
        const item = (event.item ?? {}) as Record<string, unknown>;
        const completed = type === 'item.completed';
        switch (item.type) {
            case 'agent_message':
                if (completed && typeof item.text === 'string') events.push({ type: 'message', text: item.text });
                break;
            case 'reasoning':
                if (completed && typeof item.text === 'string') events.push({ type: 'reasoning', text: item.text });
                break;
            case 'command_execution':
                if (!completed && typeof item.command === 'string') events.push({ type: 'activity', text: `$ ${item.command.replace(/\s+/g, ' ').slice(0, 160)}` });
                else if (completed && typeof item.exit_code === 'number' && item.exit_code !== 0) events.push({ type: 'activity', text: `command exited with ${item.exit_code}` });
                break;
            case 'file_change': {
                const changes = Array.isArray(item.changes) ? (item.changes as Array<{ path?: string; kind?: string }>) : [];
                if (completed && changes.length) {
                    events.push({ type: 'activity', text: `edited ${changes.map((change) => change.path).join(', ').slice(0, 160)}` });
                    events.push({ type: 'files', paths: changes.map((change) => change.path).filter((path): path is string => typeof path === 'string' && path !== '') });
                }
                break;
            }
            case 'mcp_tool_call':
                if (!completed) events.push({ type: 'activity', text: `${String(item.server)}.${String(item.tool)} ${summarizeToolInput(item.arguments)}`.trim() });
                break;
            case 'web_search':
                if (!completed) events.push({ type: 'activity', text: `web search ${String(item.query ?? '')}`.trim() });
                break;
            case 'error':
                if (typeof item.message === 'string') events.push({ type: 'error', text: item.message });
                break;
            default:
                break;
        }
    } else if (type === 'turn.completed') {
        // The completed turn's totals (one turn per run).
        events.push({ type: 'usage', usage: numericUsage(event.usage), semantics: 'cumulative' });
    } else if (type === 'turn.failed') {
        events.push({ type: 'turn-failed', text: String((event.error as { message?: string } | undefined)?.message ?? 'Codex turn failed.') });
    } else if (type === 'error' && typeof event.message === 'string') {
        events.push({ type: 'error', text: event.message });
    }
    void state;
    return events;
}

/**
 * OpenAI Codex integration.
 *
 * @private harness plugin
 */
export const plugin: HarnessPlugin = {
    id: 'openai-codex',
    variant: 'OPENAI_CODEX',
    apiKeyVariable: 'CODEX_API_KEY',
    ambientApiKeyVariables: API_KEY_VARIABLES,
    accountHomeVariable: 'CODEX_HOME',
    displayName: 'OpenAI Codex',
    featured: true,
    executable: 'codex',
    npmPackage: '@openai/codex',
    homepage: 'https://developers.openai.com/codex/cli',
    thinkingLevels: ['low', 'medium', 'high', 'xhigh'],
    thinkingLabel: 'reasoning effort (model_reasoning_effort)',
    defaultModel: 'gpt-5-codex',
    defaultThinkingLevel: 'medium',
    modelCatalog: 'complete',
    endpoints: { official: 'https://api.openai.com/v1', local: 'http://localhost:11434/v1', custom: true },
    capabilities: { mcp: true, readOnly: true },
    loginArgs: ['login'],
    loginHint: 'Run `codex login` (on a server without a browser: `codex login --device-auth`) and sign in with your ChatGPT account.',
    loginMethods,
    classifyLogin,
    inspect,
    listModels: listCodexModels,
    buildInvocation,
    parseLine,
};
