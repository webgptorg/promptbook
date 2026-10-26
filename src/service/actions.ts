import type { ComposedSegment } from '../ui/composer.js';
import { PtbkError } from '../common/errors.js';
import { parseSettingValue, SETTING_SPEC_BY_KEY } from '../project/config.js';
import type { Agenda } from '../engine/agenda.js';
import { formatBytes } from '../engine/health.js';
import { defaultChatAgent } from '../chats/service.js';
import type { ToolOperation, ToolOperationOutcome } from '../tools/operations.js';

/**
 * Runtime actions shared by every channel (CLI, terminal, browser, API): the engine's lifecycle operations, wait
 * skipping, coordinated project-browser recovery and the Health sub-engine's operations. `stop-now`/`cancel-stop`
 * remain as compatibility aliases.
 *
 * @private shared runtime controls
 */
export type ControlAction =
    | 'pause'
    | 'resume'
    | 'skip-wait'
    | 'stop'
    | 'force-stop'
    | 'restart'
    | 'stop-now'
    | 'cancel-stop'
    | 'browser-recheck'
    | 'browser-retry'
    | 'browser-restart'
    | 'sync-now'
    | 'health-recheck'
    | 'health-override'
    | 'health-clean-cache'
    | 'health-swap';

/**
 * Every control action name (for request validation).
 *
 * @private shared runtime controls
 */
export const CONTROL_ACTIONS: ReadonlySet<string> = new Set<ControlAction>([
    'pause',
    'resume',
    'skip-wait',
    'stop',
    'force-stop',
    'restart',
    'stop-now',
    'cancel-stop',
    'browser-recheck',
    'browser-retry',
    'browser-restart',
    'sync-now',
    'health-recheck',
    'health-override',
    'health-clean-cache',
    'health-swap',
]);

/**
 * Outcome of a control action as every client reports it (`data`: a preview or plan the client shows before the
 * confirmed operation).
 *
 * @private shared runtime controls
 */
export type ControlOutcome = { readonly action: string; readonly outcome: string; readonly applied: boolean; readonly completed?: boolean; readonly state?: string; readonly data?: unknown };

/**
 * Engine-owned browser recovery operations (the service owns the project browser).
 *
 * @private shared runtime controls
 */
export type BrowserControls = {
    readonly recheck: (name?: string) => Promise<ControlOutcome>;
    readonly retry: (name?: string) => Promise<ControlOutcome>;
    readonly restart: (name?: string) => Promise<ControlOutcome>;
};

/**
 * Applies one runtime control action and reports its actual outcome (accepted/pending versus completed).
 *
 * @private shared runtime controls
 */
export async function applyControlAction(agenda: Agenda, action: string, params: Readonly<Record<string, unknown>> = {}, browser?: BrowserControls): Promise<ControlOutcome> {
    switch (action) {
        case 'pause':
            return agenda.pause({ replaceStop: params.replaceStop === true, revision: typeof params.revision === 'number' ? params.revision : undefined });
        case 'resume':
            return agenda.resume();
        case 'skip-wait': {
            const result = agenda.skipWait();
            return { action, outcome: result.applied ? 'Wait skipped.' : (result.reason ?? 'Nothing to skip.'), applied: result.applied };
        }
        case 'stop':
            return agenda.requestStop({});
        case 'force-stop':
        case 'stop-now':
            return agenda.requestStop({ force: true });
        case 'restart':
            return agenda.requestStop({ restart: true });
        case 'cancel-stop':
            return agenda.cancelStop();
        case 'sync-now': {
            // One cycle of the shared coordinator (never a second scheduler, never enabling a disabled policy).
            const result = await agenda.synchronizeNow();
            return { action, outcome: result.message, applied: result.outcome !== 'disabled', completed: result.outcome === 'synchronized' };
        }
        case 'health-recheck':
            return { action, ...(await agenda.healthRecheck()) };
        case 'health-override':
            // Incident-scoped: only a soft health pause can be overridden (a hard one is refused).
            return { action, ...agenda.healthOverride(typeof params.incident === 'string' && params.incident ? params.incident : undefined) };
        case 'health-clean-cache': {
            // Destructive cleanup is two-phase: a preview first, then the confirmed operation recomputes what it removes.
            if (params.confirm !== true) {
                const preview = await agenda.healthCachePreview();
                if (!preview) return { action, outcome: 'This process has no Health sub-engine.', applied: false };
                return { action, outcome: `${preview.entries.filter((entry) => !entry.kept).length} cache entr${preview.entries.filter((entry) => !entry.kept).length === 1 ? 'y' : 'ies'} (${formatBytes(preview.removableBytes)}) can be removed from ${preview.path}/; confirm to clean.`, applied: false, data: preview };
            }
            return { action, ...(await agenda.healthCleanCache()) };
        }
        case 'health-swap': {
            if (params.apply !== true) {
                const plan = await agenda.healthSwapPlan();
                if (!plan) return { action, outcome: 'This process has no Health sub-engine.', applied: false };
                return { action, outcome: plan.proposal ? `${plan.note} Planned: ${plan.proposal.sizeMiB} MiB at ${plan.proposal.path} (${plan.proposal.privilege === 'missing' ? 'an administrator must run it' : `runs as ${plan.proposal.privilege}`}).` : plan.note, applied: false, data: plan };
            }
            return { action, ...(await agenda.healthApplySwap()) };
        }
        case 'browser-recheck':
        case 'browser-retry':
        case 'browser-restart': {
            if (!browser) return { action, outcome: 'This process does not own a project browser.', applied: false };
            const name = typeof params.name === 'string' && params.name ? params.name : undefined;
            return action === 'browser-recheck' ? await browser.recheck(name) : action === 'browser-retry' ? await browser.retry(name) : await browser.restart(name);
        }
        default:
            throw new PtbkError(`Unknown control action "${action}".`, { kind: 'usage' });
    }
}

/**
 * Composed message segments of a request. Attachments name local files, which only the engine host's own trusted
 * control channel may submit: a remote client can never make the engine copy host files into the project.
 */
function requestSegments(params: Readonly<Record<string, unknown>>, trusted: boolean): ComposedSegment[] | undefined {
    if (!Array.isArray(params.segments)) return undefined;
    const segments: ComposedSegment[] = [];
    for (const raw of params.segments as unknown[]) {
        const segment = (raw ?? {}) as Record<string, unknown>;
        if (segment.type === 'text' && typeof segment.text === 'string') segments.push({ type: 'text', text: segment.text, ...(segment.pasted === true ? { pasted: true } : {}) });
        else if (segment.type === 'attachment' && (segment.kind === 'image' || segment.kind === 'file') && typeof segment.path === 'string' && typeof segment.name === 'string') {
            if (!trusted) throw new PtbkError('Attachments by local file path are accepted only from a terminal on the engine’s computer.', { kind: 'usage', effect: 'Nothing was saved.' });
            segments.push({ type: 'attachment', kind: segment.kind, path: segment.path, name: segment.name });
        } else throw new PtbkError('Invalid message segments.', { kind: 'usage', effect: 'Nothing was saved.' });
    }
    return segments;
}

/**
 * Chat operations shared by every channel (terminal, browser, API, CLI); writes go through the agenda's chat store.
 * `trusted` marks the engine host's local control channel (the only one allowed to attach local files).
 *
 * @private shared runtime controls
 */
export async function applyChatAction(agenda: Agenda, method: string, params: Readonly<Record<string, unknown>>, via: string, options: { readonly trusted?: boolean } = {}): Promise<unknown> {
    const text = (key: string): string => (typeof params[key] === 'string' ? (params[key] as string) : '');
    const segments = requestSegments(params, options.trusted === true);
    switch (method) {
        case 'chat-list':
            return await agenda.chatList();
        case 'chat-agents':
            return agenda.chatAgents();
        case 'chat-get':
            return await agenda.chatGet(text('name'));
        case 'chat-read':
            await agenda.chatRead(text('name'));
            return { read: true };
        case 'chat-create': {
            // A new human chat without an explicit target goes to Chatter (diagnosed, never silently replaced).
            const agent = text('agent') || defaultChatAgent(agenda.chatAgents()).reference;
            const written = await agenda.chatCreate(agent, text('text'), { name: text('title') || undefined, requestKey: text('requestKey') || undefined, segments });
            return { name: written.chat.name, path: written.relativePath, commit: written.commit, persistence: written.persistence, messages: written.chat.messages.length };
        }
        case 'chat-send': {
            const expected = typeof params.expected === 'number' ? params.expected : undefined;
            const written = await agenda.chatSend(text('name'), text('text'), { expected, via, segments });
            return { name: written.chat.name, path: written.relativePath, commit: written.commit, persistence: written.persistence, messages: written.chat.messages.length, status: written.chat.status };
        }
        default:
            throw new PtbkError(`Unknown chat action "${method}".`, { kind: 'usage' });
    }
}

/**
 * Validates raw setting changes from a channel and applies them (temporary unless saved).
 *
 * @private shared runtime controls
 */
export async function applySettings(agenda: Agenda, params: Readonly<Record<string, unknown>>): Promise<unknown> {
    const raw = (params.changes ?? {}) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new PtbkError('Settings changes must be an object.', { kind: 'usage' });
    const parsed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw)) {
        const spec = SETTING_SPEC_BY_KEY.get(key);
        if (!spec) throw new PtbkError(`Unknown setting ${key}.`, { kind: 'usage' });
        const result = parseSettingValue(spec, value);
        if (!result.ok) throw new PtbkError(`Invalid value for ${key}: ${result.message}.`, { kind: 'usage' });
        parsed[key] = result.value;
    }
    return await agenda.updateSettings(parsed, params.save === true);
}

/**
 * Validates a tool-management request from any channel and applies it through the engine's shared operation (the
 * same implementation as a stopped project's CLI). A secret is write-only: it is never part of the reply.
 *
 * @private shared runtime controls
 */
export async function applyToolAction(agenda: Agenda, params: Readonly<Record<string, unknown>>, via: string): Promise<ToolOperationOutcome> {
    const operation = params.operation as ToolOperation | undefined;
    const kinds = ['add', 'modify', 'enable', 'disable', 'remove', 'move'];
    if (!operation || typeof operation !== 'object' || !kinds.includes(String((operation as { kind?: unknown }).kind))) throw new PtbkError(`A tool operation needs a kind (${kinds.join(', ')}).`, { kind: 'usage' });
    if (operation.kind === 'add' ? !operation.tool || typeof operation.tool !== 'object' : typeof (operation as { name?: unknown }).name !== 'string') throw new PtbkError('The tool operation is missing its tool (add) or name.', { kind: 'usage' });
    const acknowledgements = (params.acknowledgements ?? {}) as Record<string, unknown>;
    const secret = params.secret as { variable?: unknown; value?: unknown } | undefined;
    if (secret !== undefined && (typeof secret.variable !== 'string' || typeof secret.value !== 'string' || !secret.value)) throw new PtbkError('A secret needs its variable name and a nonempty value.', { kind: 'usage' });
    return await agenda.toolOperation({
        operation,
        acknowledgements: { force: acknowledgements.force === true, confirmLastOfType: acknowledgements.confirmLastOfType === true },
        secret: secret ? { variable: String(secret.variable), value: String(secret.value) } : undefined,
        via,
    });
}
