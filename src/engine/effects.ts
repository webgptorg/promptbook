import type { ChatSummary } from '../chats/store.js';
import { PtbkError } from '../common/errors.js';
import type { ServiceSnapshot } from './snapshot.js';

/** A bounded, nonsecret cue addressed to one participating project viewer. @private project effects */
export type ProjectEffect = {
    readonly key: string;
    readonly kind: 'attention' | 'reply' | 'select' | 'send';
    readonly domain: string;
    readonly title: string;
    readonly body: string;
    readonly chat?: string;
    readonly message?: number;
};

/** One exchange on the authenticated local channel; only actual input sets `active`. @private project effects */
export type EffectsRequest = {
    readonly client: string;
    readonly operation: 'join' | 'poll' | 'leave' | 'input' | 'toggle' | 'cue';
    readonly cue?: 'select' | 'send';
};

/** Shared temporary preference and once-only deliveries claimed by this exchange. @private project effects */
export type EffectsReply = {
    readonly enabled: boolean;
    readonly owner: boolean;
    readonly effects: readonly ProjectEffect[];
    /** Whole-project title/status even when the caller is a standalone chat and effects are Off. */
    readonly status?: ProjectClientStatus;
    /** Current sources for safe, read-only notification activation validation. */
    readonly active?: readonly string[];
};

/** Minimal common title state; it never implies that losing a connection proves the engine stopped. @private project effects */
export type ProjectClientStatus = { readonly project: string; readonly state: string; readonly attention: boolean; readonly agent?: { readonly name: string; readonly activity: string } };

/** One live participant; receipt uncertainty discards its queued effects rather than replaying them. */
type Participant = { id: string; alive: number; used: number };

/** Serializable runtime state, used by standalone chats when no service owns the project. @private project effects */
export type EffectsState = {
    enabled: boolean;
    clients: Participant[];
    owner?: string;
    activity: number;
    order: number;
    observed: string[];
    consumed: string[];
    pending: ProjectEffect[];
};

/** A viewer absent for fifteen seconds loses participation and all unclaimed effects. */
const CLIENT_LEASE_MS = 15_000;

/** Attention while the operator is actively using any participating project view is consumed silently. */
const RECENT_INPUT_MS = 10_000;

/** Validates the small local control contract before touching participation. @private project effects */
export function effectsRequest(params: Readonly<Record<string, unknown>>): EffectsRequest {
    if (typeof params.client !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(params.client) || !['join', 'poll', 'leave', 'input', 'toggle', 'cue'].includes(String(params.operation))) throw new PtbkError('Invalid project effects request.', { kind: 'usage' });
    if (params.operation === 'cue' && params.cue !== 'select' && params.cue !== 'send') throw new PtbkError('Invalid project interaction cue.', { kind: 'usage' });
    return { client: params.client, operation: params.operation as EffectsRequest['operation'], ...(params.cue === 'select' || params.cue === 'send' ? { cue: params.cue } : {}) };
}

/** Creates a fresh session: the preference is never a project setting or a durable user preference. */
function freshState(): EffectsState {
    return { enabled: false, clients: [], activity: 0, order: 0, observed: [], consumed: [], pending: [] };
}

/**
 * One coordinator per project engine. It consumes occurrences when accepted, independently of repaint/polling, and
 * grants delivery to just the last-used live viewer. Handoffs, reconnects and enabling establish silent baselines.
 * State never contains credentials. The engine keeps it only in memory; standalone clients share a leased runtime
 * file under the existing project authoring lock. A lost response is never retried as a fresh delivery.
 * @private project effects
 */
export class ProjectEffects {
    public constructor(public state: EffectsState = freshState(), private readonly now: () => number = Date.now) {}

    /** Expires absent viewers; an empty session forgets the preference and event history. */
    private prune(): void {
        const state = this.state;
        state.clients = state.clients.filter((client) => this.now() - client.alive < CLIENT_LEASE_MS);
        if (!state.clients.length) this.state = freshState();
        else if (!state.clients.some((client) => client.id === state.owner)) {
            state.owner = [...state.clients].sort((a, b) => b.used - a.used)[0]!.id;
            state.pending = [];
            state.activity = this.now();
        }
    }

    /** Observes the whole project. Existing backlog is baselined on first participation, never announced. */
    public observe(events: readonly ProjectEffect[]): void {
        this.prune();
        const state = this.state;
        if (!state.clients.length) return;
        const previous = new Set(state.observed);
        const consumed = new Set(state.consumed);
        const fresh = events.filter((event) => !previous.has(event.key) && (event.kind !== 'attention' || !consumed.has(event.key)));
        state.observed = events.map((event) => event.key);
        for (const event of events) if (event.kind === 'attention') consumed.add(event.key);
        state.consumed = [...consumed];
        if (!state.enabled || !state.owner) return;
        const attention = fresh.filter((event) => event.kind === 'attention');
        // One attention sound replaces any reply-start sound for the same observation.
        const eligible = attention.length ? (this.now() - state.activity >= RECENT_INPUT_MS ? attention : []) : fresh.filter((event) => event.kind === 'reply');
        state.pending.push(...eligible);
        // Bounded burst: retain useful source content without replaying an unbounded backlog to a slow viewer.
        state.pending = state.pending.slice(-10);
    }

    /** Handles one registration/input/heartbeat atomically and consumes any delivery before returning it. */
    public exchange(request: EffectsRequest, events: readonly ProjectEffect[]): EffectsReply {
        this.prune();
        let state = this.state;
        let client = state.clients.find((candidate) => candidate.id === request.client);
        const joining = !client;
        if (request.operation === 'leave') {
            state.clients = state.clients.filter((candidate) => candidate.id !== request.client);
            this.prune();
            return { enabled: this.state.enabled, owner: false, effects: [] };
        }
        if (joining) {
            client = { id: request.client, alive: this.now(), used: ++state.order };
            state.clients.push(client);
            state.owner = client.id;
            state.activity = this.now();
            state.pending = [];
            state.observed = events.map((event) => event.key);
            state.consumed = [...new Set([...state.consumed, ...events.filter((event) => event.kind === 'attention').map((event) => event.key)])];
        }
        client!.alive = this.now();
        const active = request.operation === 'input' || request.operation === 'toggle' || request.operation === 'cue';
        if (active) {
            if (state.owner !== request.client) state.pending = [];
            state.owner = request.client;
            client!.used = ++state.order;
            state.activity = this.now();
        }
        if (request.operation === 'toggle') {
            state.enabled = !state.enabled;
            state.pending = [];
            state.observed = events.map((event) => event.key);
        }
        this.observe(events);
        state = this.state;
        const owner = state.owner === request.client;
        const effects = owner && state.enabled ? state.pending.splice(0) : [];
        if (owner && state.enabled && request.operation === 'cue' && request.cue) effects.push({ key: `cue:${state.order}`, kind: request.cue, domain: 'interaction', title: '', body: '' });
        return { enabled: state.enabled, owner, effects: joining ? [] : effects };
    }
}

/** Unseen attributed chat calls, separate from unread messages and waiting labels. @private project effects */
export function chatEffects(chats: readonly ChatSummary[]): ProjectEffect[] {
    return chats.flatMap((chat) => (chat.pings ?? []).map((ping) => ({ key: `chat:${ping.id}`, kind: 'attention' as const, domain: 'chats', title: `${ping.sender} · ${chat.title}`, body: ping.text, chat: chat.name, message: ping.message })));
}

/** Whole-project sources; related task cards do not manufacture a second chat/Wallet occurrence. @private project effects */
export function snapshotEffects(snapshot: ServiceSnapshot): ProjectEffect[] {
    const events: ProjectEffect[] = (snapshot.chats.pings ?? []).map((ping) => ({ key: `chat:${ping.id}`, kind: 'attention', domain: 'chats', title: `${ping.sender} · ${ping.title}`, body: ping.text, chat: ping.chat, message: ping.message }));
    for (const action of snapshot.wallet?.pending ?? []) {
        if (!action.seenAt) events.push({ key: `wallet:${action.id}:${action.step ?? 0}`, kind: 'attention', domain: 'wallet', title: 'Wallet', body: `Protected ${action.problem === 'code' ? 'code' : action.problem === 'field' ? 'login field' : action.problem === 'locked' ? 'unlock' : 'login'} request for ${action.origin}. Open Wallet to respond.` });
    }
    for (const incident of snapshot.health?.incidents ?? []) {
        if (incident.needsAction) events.push({ key: `health:${incident.id}`, kind: 'attention', domain: 'health', title: 'Health', body: `${incident.summary} ${incident.needsAction}` });
    }
    if (snapshot.attention?.harnesses) for (const blocker of snapshot.blockers.filter((item) => !item.automatic && item.kind !== 'recovery')) {
        events.push({ key: `system:${blocker.kind}:${blocker.title}`, kind: 'attention', domain: 'harnesses', title: 'System', body: blocker.title });
    }
    if (snapshot.attention?.tools) events.push({ key: `tools:${snapshot.attention.tools.key}`, kind: 'attention', domain: 'tools', title: 'Tools', body: snapshot.tools?.waiting?.reason ?? 'A browser needs your action. Open Tools.' });
    if (snapshot.attention?.sync) events.push({ key: `sync:${snapshot.attention.sync.key}`, kind: 'attention', domain: 'sync', title: 'Synchronization', body: 'Configure the project synchronization destination.' });
    if (snapshot.attention?.tasks) for (const item of snapshot.queue.filter((task) => task.readiness === 'awaiting-user' && !task.waitingChat && !task.waitingWallet)) {
        events.push({ key: `task:${item.ref}:${item.reason ?? ''}`, kind: 'attention', domain: 'tasks', title: item.title, body: item.reason ?? 'The task needs your response. Open Tasks.' });
    }
    if (snapshot.attention?.wallet && !(snapshot.wallet?.pending ?? []).some((action) => !action.seenAt)) events.push({ key: `wallet:${snapshot.attention.wallet.key}`, kind: 'attention', domain: 'wallet', title: 'Wallet', body: 'Wallet needs your attention. Open Wallet to restore access.' });
    for (const name of snapshot.chats.replying ?? []) events.push({ key: `reply:${name}`, kind: 'reply', domain: 'chats', title: '', body: '', chat: name });
    return events;
}
