import { which } from '../../../common/process.js';
import type { HarnessContext, McpServerLaunch } from '../../types.js';
import { VoiceUnavailableError, type HarnessVoiceSupport, type VoiceAvailability, type VoiceEvent, type VoiceFeatures, type VoiceSession, type VoiceStartRequest } from '../../voice.js';
import { AppServer, AppServerError } from './app-server.js';

/**
 * Environment variables that could switch Codex to API billing (never present in a native voice session).
 */
const API_KEY_VARIABLES = ['OPENAI_API_KEY', 'CODEX_API_KEY', 'OPENAI_BASE_URL'];

/**
 * What the Codex realtime integration verifiably supports through ptbk with a ChatGPT login: the WebRTC transport of
 * realtime v3 (Codex refuses its websocket transport without API-key auth), negotiated through the native app server so
 * the media page never holds provider credentials; transcripts of both sides from Codex; provider turn detection for
 * barge-in; and native dispatch to the backing Codex thread.
 */
const FEATURES: VoiceFeatures = {
    inputTranscripts: true,
    outputTranscripts: true,
    interruption: 'provider',
    transport: 'webrtc',
    dispatch: 'native',
    notes: ['Speaking over the answer lets the provider cut it off; the recording marks the reply interrupted.', 'Delegated work runs in a read-only backing Codex thread with this chat’s ptbk tools; substantial work becomes ordinary tasks.'],
};

/**
 * The realtime protocol version whose WebRTC calls a ChatGPT login may make.
 */
const REALTIME_VERSION = 'v3';

/**
 * Bound of the history seeding a v3 session (Codex allows 128 items and about 8,192 tokens in total).
 */
const HISTORY_LIMITS = { items: 60, characters: 20_000 };

/**
 * Time limit of the realtime start handshake.
 */
const START_TIMEOUT_MS = 30_000;

/**
 * Display name used in results.
 */
const DISPLAY_NAME = 'OpenAI Codex';

/**
 * The native ChatGPT-only environment of a voice session.
 */
function nativeEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    const copy = { ...env };
    for (const name of API_KEY_VARIABLES) delete copy[name];
    return copy;
}

/**
 * Formats a TOML string literal.
 */
function toml(value: string): string {
    return JSON.stringify(value);
}

/**
 * App-server configuration: ChatGPT login only, and the chat's ptbk tools when given.
 */
function serverConfig(mcp?: McpServerLaunch): string[] {
    const config = ['forced_login_method="chatgpt"'];
    if (mcp) {
        const environment = Object.entries(mcp.env)
            .map(([key, value]) => `${key}=${toml(value)}`)
            .join(', ');
        config.push(`mcp_servers.ptbk.command=${toml(mcp.command)}`, `mcp_servers.ptbk.args=[${mcp.args.map(toml).join(', ')}]`, `mcp_servers.ptbk.env={${environment}}`, 'mcp_servers.ptbk.startup_timeout_sec=30', 'mcp_servers.ptbk.tool_timeout_sec=900', 'mcp_servers.ptbk.default_tools_approval_mode="approve"');
    }
    return config;
}

/**
 * A result of this adapter.
 */
function availability(context: HarnessContext, fields: Pick<VoiceAvailability, 'state' | 'reason'> & Partial<VoiceAvailability>): VoiceAvailability {
    return { harness: 'openai-codex', displayName: DISPLAY_NAME, ...(context.tool ? { tool: context.tool.name } : {}), implemented: true, features: FEATURES, checkedAt: Date.now(), ...fields };
}

/**
 * Reads the native account of an initialized app server: ChatGPT is required (never API billing).
 */
async function accountProblem(server: AppServer, context: HarnessContext): Promise<VoiceAvailability | { readonly account: string }> {
    const result = (await server.request('account/read', {})) as { account?: { type?: string; planType?: string } | null } | undefined;
    const account = result?.account;
    if (account?.type === 'chatgpt') return { account: `ChatGPT${account.planType ? ` (${account.planType})` : ''}` };
    if (account?.type) {
        return availability(context, { state: 'unavailable', reason: 'This Codex login uses an API key; native voice uses only a ChatGPT account and never falls back to API billing.', setup: { kind: 'login', text: 'Sign in with ChatGPT: codex login' }, version: server.version });
    }
    return availability(context, { state: 'unavailable', reason: 'Codex is not signed in with a ChatGPT account.', setup: { kind: 'login', text: 'Sign in with ChatGPT: codex login (on a server: codex login --device-auth)' }, version: server.version });
}

/**
 * Opens an app server for an inspection or a call, classifying a missing executable.
 */
async function openServer(context: HarnessContext, client: string, extra: { readonly mcp?: McpServerLaunch; readonly onNotification?: (method: string, params: Record<string, unknown>) => void; readonly onLog?: (line: string) => void } = {}): Promise<AppServer | VoiceAvailability> {
    const env = nativeEnvironment(context.env);
    if (!(await which('codex', env))) {
        return availability(context, { state: 'unavailable', reason: 'OpenAI Codex is not installed.', setup: { kind: 'install', text: 'Install it through Tools (ptbk tool add HARNESS --variant OPENAI_CODEX), then sign in with ChatGPT.' } });
    }
    try {
        return await AppServer.open({ cwd: context.projectRoot, env, client, config: serverConfig(extra.mcp), onNotification: extra.onNotification, onLog: extra.onLog });
    } catch (error) {
        return availability(context, { state: 'unavailable', reason: `The Codex app server did not start: ${(error as Error).message}`, setup: { kind: 'update', text: 'Update OpenAI Codex (npm install -g @openai/codex@latest) and try again.' } });
    }
}

/**
 * Checks the installed realtime interface without opening a call (`thread/realtime/listVoices` is metadata only).
 */
async function realtimeProblem(server: AppServer, context: HarnessContext): Promise<VoiceAvailability | undefined> {
    try {
        await server.request('thread/realtime/listVoices', {});
        return undefined;
    } catch (error) {
        if (error instanceof AppServerError && error.unknownMethod) {
            return availability(context, { state: 'unavailable', reason: `This Codex release${server.version ? ` (v${server.version})` : ''} has no realtime voice interface.`, setup: { kind: 'update', text: 'Update OpenAI Codex (npm install -g @openai/codex@latest).' }, version: server.version });
        }
        return availability(context, { state: 'unknown', reason: `Codex realtime voice could not be checked: ${(error as Error).message}`, setup: { kind: 'provider', text: 'Try again later.' }, version: server.version });
    }
}

/**
 * Inspects voice availability: installation, the realtime interface of the installed release and the ChatGPT login.
 * Entitlement is only proven by a started call, so a ready result says it is unverified.
 */
async function inspect(context: HarnessContext): Promise<VoiceAvailability> {
    const server = await openServer(context, 'ptbk-voice-inventory');
    if (!(server instanceof AppServer)) return server;
    try {
        const realtime = await realtimeProblem(server, context);
        if (realtime) return realtime;
        const account = await accountProblem(server, context);
        if (!('account' in account)) return account;
        return availability(context, { state: 'ready', reason: `Ready (ChatGPT account login${server.version ? `, v${server.version}` : ''}); realtime access is confirmed when a call starts.`, version: server.version, account: account.account, entitlement: 'unverified' });
    } catch (error) {
        return availability(context, { state: 'unknown', reason: `Codex voice could not be inspected: ${(error as Error).message}`, version: server.version });
    } finally {
        server.close();
    }
}

/**
 * Normalizes one realtime notification.
 */
function normalize(method: string, params: Record<string, unknown>): VoiceEvent | undefined {
    const role = params.role === 'user' || params.role === 'assistant' ? params.role : undefined;
    switch (method) {
        case 'thread/realtime/started':
            return { type: 'started', ...(typeof params.realtimeSessionId === 'string' ? { session: params.realtimeSessionId } : {}), ...(typeof params.version === 'string' ? { version: params.version } : {}) };
        case 'thread/realtime/transcript/delta':
            return role && typeof params.delta === 'string' ? { type: 'caption', role, delta: params.delta } : undefined;
        case 'thread/realtime/transcript/done':
            return role && typeof params.text === 'string' ? { type: 'transcript', role, text: params.text } : undefined;
        case 'thread/realtime/error':
            return { type: 'error', text: String(params.message ?? 'Realtime error.') };
        case 'thread/realtime/closed':
            return { type: 'closed', outcome: 'ended', ...(typeof params.reason === 'string' ? { reason: params.reason } : {}) };
        case 'thread/tokenUsage/updated': {
            const total = (params.tokenUsage as { total?: Record<string, unknown> } | undefined)?.total ?? {};
            const usage = Object.fromEntries(Object.entries(total).filter((entry): entry is [string, number] => typeof entry[1] === 'number'));
            return Object.keys(usage).length ? { type: 'usage', usage, semantics: 'cumulative' } : undefined;
        }
        default:
            return undefined;
    }
}

/**
 * The most recent complete messages that fit the v3 seeding bound, oldest first.
 *
 * @private Codex voice adapter
 */
export function seedItems(history: VoiceStartRequest['history'] = []): Array<{ readonly role: 'user' | 'assistant'; readonly text: string }> {
    const items: Array<{ role: 'user' | 'assistant'; text: string }> = [];
    let characters = 0;
    for (const item of [...history].reverse()) {
        const text = item.text.trim();
        if (!text) continue;
        if (items.length >= HISTORY_LIMITS.items || characters + text.length > HISTORY_LIMITS.characters) break;
        items.unshift({ role: item.role, text });
        characters += text.length;
    }
    return items;
}

/**
 * Starts a realtime voice session: an ephemeral read-only backing Codex thread with the chat agent's effective
 * instructions and the chat's ptbk tools, and its realtime v3 session over WebRTC with the media page's offer. The
 * provider's answer goes back to the page; media flows between the page and the provider. Readiness is revalidated; an
 * account without realtime access fails with that reason.
 */
async function start(request: VoiceStartRequest): Promise<VoiceSession> {
    const { context } = request;
    let threadId: string | undefined;
    let ended = false;
    let started: ((event: VoiceEvent) => void) | undefined;
    const early: VoiceEvent[] = [];
    let answerHandler: ((sdp: string) => void) | undefined;
    let earlyAnswer: string | undefined;
    const server = await openServer(context, 'ptbk-voice', {
        mcp: request.mcp,
        onLog: request.onLog,
        onNotification: (method, params) => {
            // After ptbk ended this session (a reload's replacement, or the call's end) its closure is no call event.
            if (ended) return;
            if (threadId && typeof params.threadId === 'string' && params.threadId !== threadId) return;
            if (method === 'thread/realtime/sdp' && typeof params.sdp === 'string') {
                if (answerHandler) answerHandler(params.sdp);
                else earlyAnswer = params.sdp;
                return;
            }
            const event = normalize(method, params);
            if (!event) return;
            if (started) started(event);
            else early.push(event);
        },
    });
    if (!(server instanceof AppServer)) throw new VoiceUnavailableError(server);
    const fail = (fields: Pick<VoiceAvailability, 'state' | 'reason'> & Partial<VoiceAvailability>): never => {
        server.close();
        throw new VoiceUnavailableError(availability(context, { version: server.version, ...fields }));
    };
    const realtime = await realtimeProblem(server, context);
    if (realtime) fail(realtime);
    const account = await accountProblem(server, context).catch((error: Error) => availability(context, { state: 'unknown', reason: error.message }));
    if (!('account' in account)) fail(account);
    try {
        const thread = (await server.request('thread/start', { cwd: context.projectRoot, sandbox: 'read-only', approvalPolicy: 'never', ephemeral: true, developerInstructions: request.instructions, ...(request.model ? { model: request.model } : {}) }, 60_000)) as { thread?: { id?: string } } | undefined;
        threadId = thread?.thread?.id;
        if (!threadId) fail({ state: 'unknown', reason: 'Codex did not open a backing thread for the call.' });
    } catch (error) {
        if (error instanceof VoiceUnavailableError) throw error;
        fail({ state: 'unavailable', reason: `Codex could not open the backing thread: ${(error as Error).message}`, setup: { kind: 'provider', text: 'Try again; check `codex` works in this project.' } });
    }
    // The start handshake: the provider answers the offer (SDP) or refuses (error/closed: entitlement or provider).
    let answer: string | undefined;
    let startedEvent: VoiceEvent | undefined;
    const accepted = await new Promise<VoiceEvent>((resolve) => {
        const timer = setTimeout(() => resolve({ type: 'error', text: 'Codex realtime did not answer in time.' }), START_TIMEOUT_MS);
        timer.unref();
        const settle = (event: VoiceEvent | { readonly type: 'answer'; readonly sdp: string }): void => {
            if (event.type === 'answer') answer = event.sdp;
            else if (event.type === 'started') startedEvent = event;
            else if (event.type === 'error' || event.type === 'closed') {
                clearTimeout(timer);
                started = request.onEvent;
                return resolve(event);
            } else request.onEvent(event);
            if (answer && startedEvent) {
                clearTimeout(timer);
                started = request.onEvent;
                resolve(startedEvent);
            }
        };
        started = settle as (event: VoiceEvent) => void;
        answerHandler = (sdp) => settle({ type: 'answer', sdp });
        const items = seedItems(request.history);
        void server
            .request('thread/realtime/start', { threadId, outputModality: 'audio', version: REALTIME_VERSION, transport: { type: 'webrtc', sdp: request.offer }, prompt: request.voiceInstructions, ...(items.length ? { initialItems: items } : {}) }, START_TIMEOUT_MS)
            .catch((error: Error) => settle({ type: 'error', text: error.message }));
        for (const event of early.splice(0)) settle(event);
        if (earlyAnswer) settle({ type: 'answer', sdp: earlyAnswer });
    });
    if (accepted.type !== 'started' || !answer) {
        const text = accepted.type === 'error' ? accepted.text : accepted.type === 'closed' ? accepted.reason ?? 'The realtime session closed.' : 'Codex sent no WebRTC answer.';
        const entitlement = /entitle|not (enabled|available|allowed)|plan|forbidden|403|unauthori[sz]ed|access/i.test(text);
        fail({ state: 'unavailable', reason: `Codex realtime voice was refused: ${text}`, setup: entitlement ? { kind: 'entitlement', text: 'This ChatGPT account or workspace does not offer realtime voice through Codex; text chat keeps working.' } : { kind: 'provider', text: 'Try again later; text chat keeps working.' } });
    }
    request.onEvent(accepted);
    void server.exited.then(() => {
        if (!ended) request.onEvent({ type: 'closed', outcome: 'failed', reason: 'The Codex app server ended.' });
    });
    return {
        dispatch: 'native',
        answer: answer!,
        supplyContext: async (text) => {
            if (ended || server.closed) return;
            await server.request('thread/realtime/appendText', { threadId, text, role: 'developer' });
        },
        end: async () => {
            if (ended) return;
            ended = true;
            await server.request('thread/realtime/stop', { threadId }, 5_000).catch(() => undefined);
            server.close();
            await server.exited.catch(() => undefined);
        },
    };
}

/**
 * Realtime voice of OpenAI Codex with native ChatGPT authentication.
 *
 * @private Codex voice adapter
 */
export const codexVoice: HarnessVoiceSupport = { inspect, start };
