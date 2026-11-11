import { createHash } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { commitmentsOf, parseBook, type BookDiagnostic } from '../../book/parse.js';
import { normalizeAgentName, referenceName } from '../../book/references.js';
import type { ChatDetail } from '../../chats/service.js';
import type { ChatSummary } from '../../chats/store.js';
import { PtbkError, errorMessage } from '../../common/errors.js';
import { ENGINE_VERSION } from '../../common/version.js';
import { completedOnboarding } from '../../onboarding/contract.js';
import type { OnboardingSession } from '../../onboarding/session.js';
import { MAX_ONBOARDING_UPLOAD_BYTES, type OnboardingFile } from '../../onboarding/uploads.js';
import type { Agenda } from '../../engine/agenda.js';
import type { AgentView, ServiceSnapshot } from '../../engine/snapshot.js';
import { api, createEngineApiHttpHandler, type ContractProblem, type ContractResponse, type ContractRoute, type ContractTransportRequest } from '../../vendor/app-platform.js';
import type { AppSecurityFacts } from '../connection.js';
import { decodeBase64Url, encodeBase64Url } from '../encoding.js';
import type { AccessStore, Actor, StoredMember, StoredPasskey, StoredSession } from '../web/access.js';
import { EngineApiState, textDigest, type AgentVisibility } from './state.js';
import { walletHandlers } from './wallet.js';
import { taskHandlers } from './tasks.js';

/**
 * Capabilities this engine advertises in `GET /engine` (every route of each works). The core API needs none.
 *
 * @private App engine API
 */
export const ADVERTISED_CAPABILITIES: readonly { readonly id: string; readonly version: number }[] = [{ id: 'onboarding', version: 1 }];

/**
 * The member ID shown as the creator of what the project itself defines (Books written in the repository).
 */
const PROJECT_MEMBER_ID = 'project';

/**
 * Characters per reply delta: a reply streams as deterministic slices of its text, so a stream resumed with
 * `Last-Event-ID` continues exactly after the last slice it saw.
 */
const DELTA_CHARACTERS = 16;

/**
 * How often a streaming reply and the event stream look for news.
 */
const STREAM_POLL_MS = 250;
const EVENTS_WAIT_MS = 15_000;

/**
 * The contract's bounds of offered answers.
 */
const MAX_CHOICES = 50;
const MAX_CHOICE_LENGTH = 1000;

/**
 * What the engine API needs from the running engine.
 *
 * @private App engine API
 */
export type EngineApiDeps = {
    readonly agenda?: Agenda;
    readonly onboarding?: OnboardingSession;
    readonly projectRoot: string;
    /** The App data directory, where the API keeps its state beside the Books. */
    readonly stateDirectory: string;
    readonly engineId: () => string | undefined;
    readonly hostname: () => string | undefined;
    readonly dashboardUrl: () => string | undefined;
    readonly security: () => AppSecurityFacts | undefined;
    /** `GET /security` → `ui`: the served engine UI (a verified bundle, or the engine's own page) and its last check. */
    readonly ui: () => Record<string, unknown>;
    readonly log?: (text: string, level: 'info' | 'warning' | 'error') => void;
};

/**
 * One handler's context.
 */
type Context = {
    readonly actor: Actor;
    readonly access: AccessStore;
    readonly state: EngineApiState;
    readonly params: Readonly<Record<string, unknown>>;
    readonly query: Readonly<Record<string, unknown>>;
    readonly body: unknown;
    readonly lastEventId: string | null;
    readonly signal: AbortSignal;
};

/**
 * A handler's answer: data for the route's success response (an async iterable for SSE), or a contract problem.
 */
type Outcome = ContractResponse;

/**
 * One server-sent event of a stream.
 */
type StreamItem = { readonly id: string | null; readonly event: { readonly type: string } & Record<string, unknown> };

/**
 * A successful answer.
 */
function ok(data: unknown): Outcome {
    return { kind: 'ok', data };
}

/**
 * A problem answer.
 */
function fail(code: string, extensions: Readonly<Record<string, unknown>> = {}): Outcome {
    return { kind: 'problem', problem: api.createProblem(code, extensions) };
}

/** Returns a problem before the contract parser consumes an oversized body. */
function problemResponse(code: string, extensions?: Readonly<Record<string, unknown>>): Response {
    const problem = api.createProblem(code, extensions);
    return Response.json(problem, { status: problem.status, headers: { 'content-type': 'application/problem+json', 'cache-control': 'no-store' } });
}

/** Bounds even a chunked upload before the shared HTTP adapter parses its multipart body. */
async function boundBody(request: Request, maximum: number): Promise<Request | undefined> {
    if (Number(request.headers.get('content-length')) > maximum) return undefined;
    if (!request.body) return request;
    const reader = request.body.getReader();
    const parts: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    try {
        for (;;) {
            const item = await reader.read();
            if (item.done) break;
            size += item.value.byteLength;
            if (size > maximum) {
                await reader.cancel();
                return undefined;
            }
            parts.push(new Uint8Array(item.value));
        }
    } finally {
        reader.releaseLock();
    }
    return new Request(request.url, { method: request.method, headers: request.headers, signal: request.signal, body: new Blob(parts) });
}

/** Compares two temporary uploads by the contract's requested sort key. */
function compareFiles(a: OnboardingFile, b: OnboardingFile, key: 'createdAt' | 'name' | 'sizeBytes'): number {
    return key === 'sizeBytes' ? a.sizeBytes - b.sizeBytes : a[key].localeCompare(b[key]);
}

/**
 * Waits, ending early when the request is aborted.
 */
function pause(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
        if (signal.aborted) return resolve();
        const timer = setTimeout(done, ms);
        signal.addEventListener('abort', done, { once: true });
        function done(): void {
            clearTimeout(timer);
            signal.removeEventListener('abort', done);
            resolve();
        }
    });
}

/**
 * A contract ID for an engine name: the name itself when it fits the opaque ID pattern, else a readable prefix and a
 * digest.
 *
 * @private App engine API
 */
export function opaqueIdOf(name: string): string {
    const plain = name.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    if (plain && plain.length <= 64 && plain === name) return plain;
    const digest = encodeBase64Url(createHash('sha256').update(name).digest()).slice(0, 12);
    return `${plain.slice(0, 48) || 'x'}-${digest}`;
}

/**
 * An ISO timestamp from an engine time (`at` of a message), or the fallback.
 */
function iso(at: string | undefined, fallback: string): string {
    const parsed = at ? Date.parse(at) : NaN;
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

/**
 * One page of items with an offset cursor.
 */
function page<T>(items: readonly T[], query: Readonly<Record<string, unknown>>): Outcome {
    const limit = typeof query.limit === 'number' ? query.limit : 50;
    let offset = 0;
    if (typeof query.cursor === 'string') {
        const decoded = decodeBase64Url(query.cursor);
        const text = decoded ? Buffer.from(decoded).toString('utf8') : '';
        const parsed = /^o\d{1,9}$/.test(text) ? Number(text.slice(1)) : NaN;
        if (!Number.isSafeInteger(parsed) || parsed < 0) return fail('invalid-cursor');
        offset = parsed;
    }
    const slice = items.slice(offset, offset + limit);
    const next = offset + limit < items.length ? encodeBase64Url(Buffer.from(`o${String(offset + limit)}`)) : null;
    return ok({ items: slice, nextCursor: next });
}

/**
 * Text split into the stream's deterministic delta slices (by code point).
 */
function slices(text: string): string[] {
    const points = [...text];
    const parts: string[] = [];
    for (let index = 0; index < points.length; index += DELTA_CHARACTERS) parts.push(points.slice(index, index + DELTA_CHARACTERS).join(''));
    return parts;
}

/**
 * An HSL hue as a `#rrggbb` colour (saturation 55%, lightness 50%).
 */
function hueColor(hue: number): string {
    const s = 0.55;
    const l = 0.5;
    const k = (n: number): number => (n + hue / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number): number => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
    return `#${[f(0), f(8), f(4)].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * A Book diagnostic as the contract's diagnostic.
 */
function contractDiagnostic(diagnostic: BookDiagnostic): Record<string, unknown> {
    const line = Math.max(1, diagnostic.line);
    return { severity: diagnostic.severity, code: 'book', message: diagnostic.message.slice(0, 1000), range: { startLine: line, startColumn: 1, endLine: line, endColumn: 1 } };
}

/**
 * An agent of the project as the API describes it.
 */
type ApiAgent = {
    readonly id: string;
    readonly permanentId: string;
    readonly name: string;
    readonly profile: { readonly fullname: string; readonly description: string; readonly avatarUrl: null; readonly color: string | null; readonly initialMessage: null };
    readonly origin: 'content' | 'core' | 'system';
    readonly visibility: AgentVisibility;
    readonly folderId: string | null;
    readonly currentRevisionId: string;
    readonly createdBy: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly deletedAt: string | null;
};

/**
 * A chat participant.
 */
type Participant = { readonly kind: 'agent' | 'user'; readonly key: string; readonly name: string };

/**
 * The Reborn engine API (`@ptbk/engine-api` v1) over the project's own domain operations: agents are the project's
 * Books (with their origin), chats are its `CHAT` threads with real authors, and members, passkeys and sessions are
 * the gateway's. Every request is validated with the route's strict schemas, authorized by permission (denials change
 * nothing), held to step-up where the route asks for it, and answered with exactly the route's response schema.
 *
 * @private App engine API
 */
export class EngineApi {
    private readonly startedAt = new Date().toISOString();
    private readonly agentNames = new Map<string, string>();
    private stateOpening?: Promise<EngineApiState>;

    public constructor(private readonly deps: EngineApiDeps) {}

    /** Project operations exist only after the regular service takes ownership. */
    private get agenda(): Agenda {
        if (!this.deps.agenda) throw new PtbkError('The project is still being initialized.', { kind: 'not-found' });
        return this.deps.agenda;
    }

    /** The capabilities available at this stage of the engine's lifecycle. */
    private get capabilities(): readonly { readonly id: string; readonly version: number }[] {
        if (this.deps.agenda) return [...ADVERTISED_CAPABILITIES, { id: 'wallet', version: 1 }, { id: 'tasks', version: 1 }];
        return this.deps.onboarding ? [...ADVERTISED_CAPABILITIES, { id: 'files', version: 1 }] : ADVERTISED_CAPABILITIES;
    }

    /** Serves one `/api/v1/...` request of a signed-in member. */
    public async handle(request: Request, actor: Actor, access: AccessStore): Promise<Response> {
        const handler = createEngineApiHttpHandler((route, parsed, signal) => this.dispatch(route, parsed, signal, actor, access));
        const routePath = new URL(request.url).pathname;
        const uploads = request.method === 'POST' && routePath === api.ENGINE_API_PREFIX + '/files';
        const answer = request.method === 'POST' && routePath === api.ENGINE_API_PREFIX + '/onboarding/answer';
        if (uploads || answer) {
            if (!actor.permissions.includes('settings.manage')) return problemResponse('forbidden', { requiredPermission: 'settings.manage' });
            if (uploads && !this.deps.onboarding) return problemResponse('capability-not-supported');
            const bounded = await boundBody(request, uploads ? MAX_ONBOARDING_UPLOAD_BYTES + 64 * 1024 : 512 * 1024);
            if (!bounded) return problemResponse('payload-too-large');
            return await handler(bounded);
        }
        return await handler(request);
    }

    /** The API state, opened on first use (a failed open is retried by the next request). */
    private async state(): Promise<EngineApiState> {
        this.stateOpening ??= EngineApiState.open(this.deps.stateDirectory).catch((error: unknown) => {
            this.stateOpening = undefined;
            throw error;
        });
        return await this.stateOpening;
    }

    /** Validates, authorizes and runs one operation. */
    private async dispatch(route: ContractRoute, request: ContractTransportRequest, signal: AbortSignal, actor: Actor, access: AccessStore): Promise<Outcome> {
        if (route.capability && !this.capabilities.some((capability) => capability.id === route.capability?.id && capability.version === route.capability.version)) return fail('capability-not-supported');
        const handler = this.handlers[route.id];
        if (!handler || route.draft) return fail('not-found');
        const errors: { path: string; message: string }[] = [];
        const parse = (part: 'params' | 'query' | 'body', schema: ContractRoute['params'], value: unknown): unknown => {
            if (!schema) return value;
            const result = schema.safeParse(value ?? (part === 'body' ? undefined : {}));
            if (result.success) return result.data;
            for (const issue of result.error.issues) errors.push({ path: [part, ...issue.path.map(String)].join('.'), message: issue.message });
            return undefined;
        };
        const params = parse('params', route.params, request.params) as Record<string, unknown>;
        const query = parse('query', route.query, request.query) as Record<string, unknown>;
        const body = route.body ? parse('body', route.body.schema, request.body) : undefined;
        if (errors.length) return fail('validation-failed', { errors: errors.slice(0, 50) });
        if (route.permission && !actor.permissions.includes(route.permission as never)) return fail('forbidden', { requiredPermission: route.permission });
        if (route.capability?.id === 'files' && !actor.permissions.includes('settings.manage')) return fail('forbidden', { requiredPermission: 'settings.manage' });
        if (route.stepUp && !actor.stepUpFresh) return fail('step-up-required');
        let outcome: Outcome;
        try {
            const state = await this.state();
            outcome = await handler({ actor, access, state, params: params ?? {}, query: query ?? {}, body, lastEventId: request.lastEventId ?? null, signal });
        } catch (error) {
            outcome = this.problemOf(error, route);
        }
        if (outcome.kind === 'ok') {
            const success = Object.values(route.responses)[0];
            if (success?.kind === 'json') {
                const checked = success.schema.safeParse(outcome.data);
                if (!checked.success) {
                    this.deps.log?.(`The engine API answer of ${route.id} broke its contract: ${checked.error.issues.slice(0, 3).map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`, 'error');
                    return fail('internal-error');
                }
            }
        }
        return outcome;
    }

    /** A domain error as a contract problem (never with internal details). */
    private problemOf(error: unknown, route: ContractRoute): Outcome {
        if (error instanceof PtbkError) {
            const kind = error.details.kind;
            if (route.capability?.id === 'wallet' && this.deps.agenda?.wallet.readiness !== 'ready') return fail('wallet-not-ready');
            if (kind === 'not-found') return fail('not-found');
            if (kind === 'conflict') return fail(route.id === 'createAgent' || route.id === 'deleteAgent' ? 'unavailable' : 'revision-conflict');
            if (kind === 'usage') return fail('validation-failed', { errors: [{ path: 'body', message: error.message.slice(0, 300) }] });
        }
        this.deps.log?.(`An engine API request (${route.id}) failed: ${errorMessage(error)}`, 'warning');
        return fail('internal-error');
    }

    /** The project's agents (content, core and the engine's own) as API agents. */
    private async agents(state: EngineApiState): Promise<ApiAgent[]> {
        const snapshot: ServiceSnapshot = this.agenda.snapshot();
        const items: ApiAgent[] = [];
        for (const view of snapshot.agents) items.push(await this.agentOf(view, state));
        return items;
    }

    /** One API agent from its engine view and Book. */
    private async agentOf(view: AgentView, state: EngineApiState): Promise<ApiAgent> {
        const id = opaqueIdOf(view.key || normalizeAgentName(view.name));
        this.agentNames.set(id, view.name);
        let revision = 'engine';
        let createdAt = this.startedAt;
        let updatedAt = this.startedAt;
        let description = view.role === 'engine' ? 'The engine’s own expert on Promptbook.' : '';
        if (view.role !== 'engine') {
            try {
                const source = await this.agenda.bookSource({ reference: view.name });
                revision = opaqueIdOf(source.revision);
                const persona = commitmentsOf(parseBook(source.text), 'PERSONA')[0]?.value;
                if (persona) description = persona.replace(/\s+/g, ' ').trim().slice(0, 4096);
                const stats = await stat(isAbsolute(source.path) ? source.path : join(this.deps.projectRoot, source.path));
                createdAt = (stats.birthtimeMs > 0 ? stats.birthtime : stats.mtime).toISOString();
                updatedAt = stats.mtime.toISOString();
                if (updatedAt < createdAt) updatedAt = createdAt;
            } catch {
                // An agent whose source cannot be read right now still lists.
            }
        }
        return {
            id,
            permanentId: id,
            name: view.name.slice(0, 256),
            profile: { fullname: view.name.slice(0, 256), description, avatarUrl: null, color: hueColor(view.hue), initialMessage: null },
            origin: view.role === 'engine' ? 'system' : view.role === 'core' ? 'core' : 'content',
            visibility: state.agentVisibility(id),
            folderId: state.agentFolder(id),
            currentRevisionId: revision,
            createdBy: state.agentCreator(id) ?? PROJECT_MEMBER_ID,
            createdAt,
            updatedAt,
            deletedAt: null,
        };
    }

    /** One agent by ID. */
    private async agent(id: string, state: EngineApiState): Promise<ApiAgent | undefined> {
        return (await this.agents(state)).find((agent) => agent.id === id);
    }

    /** An agent's activity as the contract's status. */
    private agentStatus(id: string): { state: 'idle' | 'running'; since: string } | undefined {
        const view = this.agenda.snapshot().agents.find((agent) => opaqueIdOf(agent.key || normalizeAgentName(agent.name)) === id);
        if (!view) return undefined;
        return { state: view.activity === 'working' ? 'running' : 'idle', since: this.startedAt };
    }

    /** A chat participant from an engine reference. */
    private participant(reference: string): Participant {
        const name = referenceName(reference);
        const key = normalizeAgentName(name);
        return key === 'user' ? { kind: 'user', key: 'user', name: 'User' } : { kind: 'agent', key: opaqueIdOf(key || name), name: name.slice(0, 256) || 'Agent' };
    }

    /** A chat's members, the User first. */
    private members(summary: ChatSummary): Participant[] {
        const participants = summary.members.map((member) => this.participant(member));
        return [...participants.filter((member) => member.kind === 'user'), ...participants.filter((member) => member.kind === 'agent')];
    }

    /** When a chat's Book was created and last changed. */
    private async chatTimes(summary: ChatSummary): Promise<{ createdAt: string; updatedAt: string }> {
        let createdAt = this.startedAt;
        let changedAt = this.startedAt;
        try {
            const stats = await stat(isAbsolute(summary.path) ? summary.path : join(this.deps.projectRoot, summary.path));
            createdAt = (stats.birthtimeMs > 0 ? stats.birthtime : stats.mtime).toISOString();
            changedAt = stats.mtime.toISOString();
        } catch {
            // A chat whose file cannot be read right now keeps the engine's start time.
        }
        const updatedAt = summary.last ? iso(summary.last.at, changedAt) : createdAt;
        return { createdAt, updatedAt: updatedAt < createdAt ? createdAt : updatedAt };
    }

    /** A chat summary as the contract's `Chat` (questions from the detail when given, else the unseen pings). */
    private async chat(summary: ChatSummary, detail?: ChatDetail): Promise<Record<string, unknown>> {
        const times = await this.chatTimes(summary);
        const questions = detail
            ? (detail.requests ?? []).map((request) => ({ id: request.id.slice(0, 512), messageId: `${summary.name}#${String(request.message)}`, seen: request.seen, author: this.authorRef(request.sender) }))
            : (summary.pings ?? []).map((ping) => ({ id: ping.id.slice(0, 512), messageId: `${summary.name}#${String(ping.message)}`, seen: false, author: this.authorRef(ping.sender) }));
        return {
            id: summary.name,
            title: summary.title.slice(0, 256),
            createdAt: times.createdAt,
            updatedAt: times.updatedAt,
            messageCount: summary.messages,
            lastMessageAt: summary.last ? times.updatedAt : null,
            preview: summary.last ? summary.last.preview.replace(/\s+/g, ' ').trim().slice(0, 200) || null : null,
            unread: summary.unread,
            status: summary.status === 'waiting-for-user' || summary.status === 'resolved' ? summary.status : 'open',
            members: this.members(summary),
            questions,
        };
    }

    /** A participant reference without its display name. */
    private authorRef(reference: string): { kind: 'agent' | 'user'; key: string } {
        const { kind, key } = this.participant(reference);
        return { kind, key };
    }

    /** One chat by name with its detail. */
    private async chatByName(name: string): Promise<{ summary: ChatSummary; detail: ChatDetail } | undefined> {
        const summary = (await this.agenda.chatList()).find((chat) => chat.name === name);
        if (!summary) return undefined;
        return { summary, detail: await this.agenda.chatGet(name) };
    }

    /** One stored message as the contract's `Message`. */
    private message(chatId: string, position: number, message: ChatDetail['messages'][number], state: EngineApiState, fallbackAt: string): Record<string, unknown> {
        const id = `${chatId}#${String(position)}`;
        const author = this.authorRef(message.sender);
        return {
            type: 'message',
            id,
            chatId,
            content: message.text,
            status: 'completed',
            createdBy: author.kind === 'user' ? state.messageAuthor(id) : null,
            createdAt: iso(message.at, fallbackAt),
            choices: (message.choices ?? []).filter((choice) => choice.trim()).map((choice) => choice.slice(0, MAX_CHOICE_LENGTH)).slice(0, MAX_CHOICES),
            author,
        };
    }

    /** A thread's entries, oldest first: every member joins before writing, and a reply in progress streams last. */
    private async entries(summary: ChatSummary, detail: ChatDetail, state: EngineApiState): Promise<Record<string, unknown>[]> {
        const name = summary.name;
        const { createdAt } = await this.chatTimes(summary);
        const entries: Record<string, unknown>[] = [];
        const joined = new Set<string>();
        const join = (participant: Participant, at: string): void => {
            const key = `${participant.kind}:${participant.key}`;
            if (joined.has(key)) return;
            joined.add(key);
            entries.push({ type: 'joined', id: `${name}#joined:${key}`.slice(0, 512), chatId: name, createdAt: at, participant });
        };
        for (const member of this.members(summary)) join(member, createdAt);
        detail.messages.forEach((message, index) => {
            const entry = this.message(name, index + 1, message, state, createdAt);
            join(this.participant(message.sender), entry.createdAt as string);
            entries.push(entry);
        });
        if (detail.live) {
            const author = this.participant(detail.live.sender);
            const at = iso(detail.live.startedAt, createdAt);
            join(author, at);
            entries.push({ type: 'message', id: `${name}#${String(detail.messages.length + 1)}`, chatId: name, content: detail.live.text ?? '', status: 'streaming', createdBy: null, createdAt: at, choices: [], author: { kind: author.kind, key: author.key } });
        }
        return entries;
    }

    /** The 1-based position of a message ID of a chat, if it is one. */
    private position(chatId: string, messageId: string): number | undefined {
        const prefix = `${chatId}#`;
        if (!messageId.startsWith(prefix)) return undefined;
        const text = messageId.slice(prefix.length);
        return /^[1-9]\d{0,6}$/.test(text) ? Number(text) : undefined;
    }

    /** A reply as deterministic deltas, then exactly one `completed` or `failed`. */
    private async *replyStream(chatId: string, position: number, after: number, signal: AbortSignal): AsyncGenerator<StreamItem> {
        let seq = after;
        for (;;) {
            if (signal.aborted) return;
            const found = await this.chatByName(chatId).catch(() => undefined);
            const state = await this.state();
            const stored = found?.detail.messages[position - 1];
            if (found && stored) {
                const message = this.message(chatId, position, stored, state, (await this.chatTimes(found.summary)).createdAt);
                const parts = slices(message.content as string);
                while (seq < parts.length) {
                    seq++;
                    yield { id: String(seq), event: { type: 'delta', seq, text: parts[seq - 1]! } };
                }
                yield { id: null, event: { type: 'completed', message } };
                return;
            }
            const live = found?.detail.live;
            if (!found || !live || position !== found.detail.messages.length + 1) {
                yield { id: null, event: { type: 'failed', problem: api.createProblem('reply-failed') } };
                return;
            }
            const parts = slices(live.text ?? '');
            // Only complete slices while the reply grows, so every slice is final once sent.
            const complete = (live.text ?? '').length % DELTA_CHARACTERS === 0 ? parts.length : parts.length - 1;
            while (seq < complete) {
                seq++;
                yield { id: String(seq), event: { type: 'delta', seq, text: parts[seq - 1]! } };
            }
            await pause(STREAM_POLL_MS, signal);
        }
    }

    /** What the event stream compares between changes. */
    private async eventDigest(): Promise<{ agents: Map<string, string>; status: Map<string, string>; chats: Map<string, string>; tasks: Map<string, { state: string; digest: string }> }> {
        const snapshot = this.agenda.snapshot();
        const agents = new Map<string, string>();
        const status = new Map<string, string>();
        for (const view of snapshot.agents) {
            const id = opaqueIdOf(view.key || normalizeAgentName(view.name));
            agents.set(id, `${view.name}|${view.role ?? ''}`);
            status.set(id, view.activity === 'working' ? 'running' : 'idle');
        }
        const chats = new Map<string, string>();
        for (const summary of await this.agenda.chatList()) chats.set(summary.name, `${String(summary.messages)}|${summary.status}|${String(summary.unread)}|${summary.title}|${String(summary.pings?.length ?? 0)}`);
        const tasks = new Map<string, { state: string; digest: string }>();
        const taskSnapshot = await this.agenda.taskReadSnapshot();
        for (const item of taskSnapshot.inventory) {
            const key = normalizeAgentName(item.title);
            const source = taskSnapshot.tasks.find(task => task.key === key);
            tasks.set(opaqueIdOf(key), { state: item.readiness, digest: textDigest(JSON.stringify([item, source?.source.fileHash, taskSnapshot.active.filter(record => record.taskKey === key).map(record => [record.runId, record.phase, record.updatedAt])])) });
        }
        return { agents, status, chats, tasks };
    }

    /** Live changes as `agent.status`, `agent.changed` and `chat.changed` events until the client leaves. */
    private async *eventStream(signal: AbortSignal): AsyncGenerator<StreamItem> {
        const agenda = this.agenda;
        let since = agenda.currentRevision;
        let previous = await this.eventDigest();
        while (!signal.aborted) {
            await Promise.race([agenda.waitForChange(since, EVENTS_WAIT_MS), pause(EVENTS_WAIT_MS, signal)]);
            if (signal.aborted) return;
            since = agenda.currentRevision;
            await pause(STREAM_POLL_MS, signal);
            const next = await this.eventDigest();
            const now = new Date().toISOString();
            for (const [id, value] of next.agents) if (previous.agents.get(id) !== value) yield { id: null, event: { type: 'agent.changed', agentId: id } };
            for (const id of previous.agents.keys()) if (!next.agents.has(id)) yield { id: null, event: { type: 'agent.changed', agentId: id } };
            for (const [id, value] of next.status) if (previous.status.get(id) !== value) yield { id: null, event: { type: 'agent.status', agentId: id, state: value, since: now } };
            for (const [name, value] of next.chats) if (previous.chats.get(name) !== value) yield { id: null, event: { type: 'chat.changed', chatId: name } };
            for (const name of previous.chats.keys()) if (!next.chats.has(name)) yield { id: null, event: { type: 'chat.changed', chatId: name } };
            for (const [taskId, value] of next.tasks) if (previous.tasks.get(taskId)?.digest !== value.digest) yield { id: null, event: { type: 'task.changed', taskId, state: value.state } };
            for (const [taskId, value] of previous.tasks) if (!next.tasks.has(taskId)) yield { id: null, event: { type: 'task.changed', taskId, state: value.state } };
            previous = next;
        }
    }

    /** The members list entry of the contract. */
    private member(member: StoredMember, access: AccessStore): Record<string, unknown> {
        return { id: member.id, displayName: member.displayName, role: member.role, status: member.status, createdAt: member.createdAt, lastSeenAt: member.lastSeenAt, passkeyCount: access.passkeys(member.id).length, dashboardUserId: null };
    }

    /** A passkey as the contract lists it. */
    private passkey(passkey: StoredPasskey): Record<string, unknown> {
        return { id: passkey.id, memberId: passkey.memberId, name: passkey.name, createdAt: passkey.createdAt, lastUsedAt: passkey.lastUsedAt, authenticator: { attachment: passkey.attachment, backedUp: passkey.backedUp } };
    }

    /** A session as the contract lists it. */
    private session(session: StoredSession, actor: Actor): Record<string, unknown> {
        return { id: session.id, memberId: session.memberId, current: session.id === actor.sessionId, client: session.client, passkeyId: session.passkeyId, createdAt: session.createdAt, lastSeenAt: session.lastSeenAt, expiresAt: session.expiresAt };
    }

    /** The engine settings the API exposes. */
    private settings(state: EngineApiState): Record<string, unknown> {
        const update = this.deps.agenda?.engineUpdate as { readonly isAutoUpdateEnabled?: boolean } | undefined;
        return {
            name: (state.settings.name ?? (this.deps.agenda?.snapshot().project.name ?? 'Pending initialization')).slice(0, 128) || 'Promptbook project',
            defaultAgentVisibility: state.settings.defaultAgentVisibility ?? 'private',
            updatePolicy: { policy: update?.isAutoUpdateEnabled === false ? 'manual' : 'auto', pinnedVersion: null },
            dashboardRemovals: null,
        };
    }

    /** The security overview: versions, update state, certificate, relays, hostnames, the last heartbeat. */
    private security(): Record<string, unknown> {
        const facts = this.deps.security();
        const update = this.deps.agenda?.snapshot().update;
        const updateStatus = !update ? 'none' : update.phase === 'installing' || update.phase === 'restarting' ? 'installing' : update.target ? 'pending' : update.latest && update.latest !== update.current ? 'available' : 'none';
        const autoUpdate = (this.deps.agenda?.engineUpdate as { readonly isAutoUpdateEnabled?: boolean } | undefined)?.isAutoUpdateEnabled !== false;
        const relayStatus = (state: string): 'connected' | 'connecting' | 'disconnected' => (state === 'connected' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected');
        const certificateStatus = (): 'valid' | 'pending' | 'expiring' | 'expired' | 'error' | null => {
            if (!facts?.certificateState) return null;
            if (facts.certificate && Date.parse(facts.certificate.notAfter) <= Date.now()) return 'expired';
            if (facts.certificate && Date.parse(facts.certificate.notAfter) - Date.now() < 7 * 24 * 3600_000) return 'expiring';
            return facts.certificateState === 'valid' ? 'valid' : facts.certificateState === 'failed' ? 'error' : 'pending';
        };
        const destinations = new Set<string>();
        if (facts?.dashboardUrl) destinations.add(new URL(facts.dashboardUrl).host);
        for (const relay of facts?.relays ?? []) destinations.add(relay.relay);
        if (facts?.acmeDirectoryUrl) destinations.add(new URL(facts.acmeDirectoryUrl).host);
        const heartbeat = facts?.heartbeat;
        return {
            engine: { version: ENGINE_VERSION, releaseLogIndex: null, releaseLogEntryUuid: null },
            update: { status: updateStatus, policy: autoUpdate ? 'auto' : 'manual', pinnedVersion: null, availableVersion: updateStatus === 'available' && update?.latest ? update.latest : null, eligibleAt: null },
            ui: this.deps.ui(),
            tls: { certificateSha256: facts?.certificate?.sha256 ?? '0'.repeat(64), notAfter: facts?.certificate?.notAfter ?? new Date(0).toISOString(), lastCtCheck: null },
            relays: (facts?.relays ?? []).map((relay) => ({ hostname: relay.relay, status: relayStatus(relay.state), since: iso(relay.since, this.startedAt), lastPingRttMs: null })),
            hostnames: facts?.hostname ? [{ hostname: facts.hostname, kind: 'default', certificateStatus: certificateStatus(), claimRegistered: null }] : [],
            lastHeartbeat: heartbeat?.body ? { sentAt: iso(heartbeat.at, this.startedAt), body: heartbeat.body, signature: null } : null,
            clockSkew: facts?.clockSkew ?? null,
            outboundDestinations: [...destinations],
        };
    }

    /** The handlers by route ID. */
    private readonly handlers: Readonly<Record<string, (context: Context) => Promise<Outcome>>> = {
        ...taskHandlers(includeHistory => this.agenda.taskReadSnapshot(includeHistory), opaqueIdOf, page),
        ...walletHandlers(() => this.agenda.wallet),
        getOnboarding: async () => ok(this.deps.onboarding?.state() ?? completedOnboarding),
        answerOnboarding: async ({ body }) => {
            if (!this.deps.onboarding) return fail('onboarding-prompt-stale');
            try {
                return ok(await this.deps.onboarding.answer(body));
            } catch (error) {
                if (error instanceof PtbkError && error.details.kind === 'conflict') return fail('onboarding-prompt-stale');
                if (error instanceof PtbkError && error.details.kind === 'usage') return fail('validation-failed', { errors: [{ path: 'body', message: error.message }] });
                throw error;
            }
        },
        deferOnboarding: async () => ok(await this.deps.onboarding?.defer() ?? completedOnboarding),
        getFileUploadPolicy: async ({ query }) => query.purpose === 'upload'
            ? ok({ purpose: 'upload', maxBytes: MAX_ONBOARDING_UPLOAD_BYTES, accept: [] })
            : fail('unsupported-media-type'),
        uploadFile: async ({ body, actor }) => {
            const input = body as { file: Blob; name: string; purpose: string; agentId?: string };
            if (input.purpose !== 'upload' || input.agentId) return fail('validation-failed', { errors: [{ path: 'body.purpose', message: 'Onboarding accepts only engine-wide uploads.' }] });
            const file = await this.deps.onboarding!.upload(input.file, input.name, actor.memberId);
            return file ? ok(file) : fail('payload-too-large');
        },
        listFiles: async ({ query }) => {
            const files = await this.deps.onboarding!.uploads.list();
            const purpose = query.purpose as string[] | undefined;
            const needle = typeof query.q === 'string' ? query.q.toLowerCase() : '';
            const selected = query.agentId || query.scan || (purpose && !purpose.includes('upload')) ? [] : files.filter((file) => file.name.toLowerCase().includes(needle));
            const sort = String(query.sort ?? '-createdAt');
            const key = sort.replace(/^-/, '') as 'createdAt' | 'name' | 'sizeBytes';
            selected.sort((a, b) => compareFiles(a, b, key) * (sort.startsWith('-') ? -1 : 1));
            return page(selected, query);
        },
        getFileStats: async ({ query }) => ok({
            byPurpose: { knowledge: 0, attachment: 0, output: 0, upload: query.agentId ? 0 : (await this.deps.onboarding!.uploads.list()).length },
            byScan: { pending: 0, clean: 0, infected: 0, failed: 0 },
        }),
        getFile: async ({ params }) => {
            const file = await this.deps.onboarding!.uploads.get(String(params.fileId));
            return file ? ok(file) : fail('not-found');
        },
        listFileVersions: async ({ params, query }) => {
            const file = await this.deps.onboarding!.uploads.get(String(params.fileId));
            return file ? page([{ id: file.id, sizeBytes: file.sizeBytes, createdAt: file.createdAt, sha256: file.sha256, commitHash: null, runId: null }], query) : fail('not-found');
        },
        downloadFile: async ({ params, query }) => {
            if (query.version && query.version !== params.fileId) return fail('not-found');
            const bytes = await this.deps.onboarding!.uploads.download(String(params.fileId));
            return bytes ? ok(bytes) : fail('not-found');
        },
        deleteFile: async ({ params }) => {
            const result = await this.deps.onboarding!.deleteUpload(String(params.fileId));
            return result === 'deleted' ? ok(null) : result === 'in-use' ? fail('forbidden') : fail('not-found');
        },
        getMe: async ({ actor, access }) => ok({ memberId: actor.memberId, orgId: access.orgId, displayName: actor.displayName, role: actor.role, permissions: [...actor.permissions] }),
        listMyPasskeys: async ({ actor, access, query }) => page(access.passkeys(actor.memberId).map((passkey) => this.passkey(passkey)), query),
        revokeMyPasskey: async ({ actor, access, params }) => {
            const own = access.passkeys(actor.memberId);
            if (!own.some((passkey) => passkey.id === params.passkeyId)) return fail('not-found');
            if (own.length <= 1) return fail('last-passkey');
            await access.revokePasskey(String(params.passkeyId));
            return ok(null);
        },
        listMySessions: async ({ actor, access, query }) => page(access.sessions(actor.memberId).map((session) => this.session(session, actor)), query),
        revokeMySession: async ({ actor, access, params }) => {
            const revoked = await access.revokeSessions((session) => session.id === params.sessionId && session.memberId === actor.memberId);
            return revoked ? ok(null) : fail('not-found');
        },
        revokeMyOtherSessions: async ({ actor, access }) => ok({ revoked: await access.revokeSessions((session) => session.memberId === actor.memberId && session.id !== actor.sessionId) }),
        getEngine: async ({ state }) =>
            ok({
                name: (state.settings.name ?? (this.deps.agenda?.snapshot().project.name ?? 'Pending initialization')).slice(0, 128) || 'Promptbook project',
                engineId: this.deps.engineId() ?? null,
                hostname: this.deps.hostname() ?? 'engine.invalid',
                dashboardUrl: this.deps.dashboardUrl() ?? null,
                mode: 'tunnel',
                capabilities: this.capabilities,
            }),
        listAgents: async ({ query, state }) => {
            // Removed agents leave the project (their Books stay in Git history): nothing is listed as deleted.
            let agents = query.deleted === 'only' || !this.deps.agenda ? [] : await this.agents(state);
            if (typeof query.q === 'string') {
                const needle = query.q.toLowerCase();
                agents = agents.filter((agent) => agent.name.toLowerCase().includes(needle) || agent.profile.fullname.toLowerCase().includes(needle) || agent.profile.description.toLowerCase().includes(needle));
            }
            if (Array.isArray(query.origin)) agents = agents.filter((agent) => (query.origin as string[]).includes(agent.origin));
            if (typeof query.folderId === 'string') agents = agents.filter((agent) => agent.folderId === query.folderId);
            if (typeof query.visibility === 'string') agents = agents.filter((agent) => agent.visibility === query.visibility);
            if (typeof query.status === 'string') agents = agents.filter((agent) => (this.agentStatus(agent.id)?.state ?? 'idle') === query.status);
            const sort = String(query.sort ?? 'name');
            const key = sort.replace(/^-/, '') as 'name' | 'updatedAt' | 'createdAt';
            agents.sort((a, b) => (a[key].localeCompare(b[key]) || a.id.localeCompare(b.id)) * (sort.startsWith('-') ? -1 : 1));
            return page(agents, query);
        },
        createAgent: async ({ actor, body, state }) => {
            const input = body as { source: string; folderId?: string; visibility?: AgentVisibility };
            if (input.folderId && !state.folder(input.folderId)) return fail('not-found');
            let created: { readonly name: string };
            try {
                created = await this.agenda.agentCreate(input.source);
            } catch (error) {
                const data = error instanceof PtbkError ? (error.details.data as { invalidBook?: boolean; diagnostics?: readonly BookDiagnostic[] } | undefined) : undefined;
                if (data?.invalidBook) return fail('invalid-book', { diagnostics: (data.diagnostics ?? []).slice(0, 50).map(contractDiagnostic) });
                throw error;
            }
            const id = opaqueIdOf(normalizeAgentName(created.name));
            await state.recordAgent(id, { ...(input.folderId ? { folderId: input.folderId } : {}), ...(input.visibility ? { visibility: input.visibility } : {}), creator: actor.memberId });
            const agent = await this.agent(id, state);
            return agent ? ok(agent) : fail('internal-error');
        },
        getAgent: async ({ params, state }) => {
            const agent = await this.agent(String(params.agentId), state);
            return agent ? ok(agent) : fail('not-found');
        },
        deleteAgent: async ({ params, state }) => {
            const agent = await this.agent(String(params.agentId), state);
            if (!agent) return fail('not-found');
            if (agent.origin !== 'content') return fail('agent-engine-owned');
            await this.agenda.agentRemove(this.agentNames.get(agent.id) ?? agent.name);
            await state.forgetAgent(agent.id);
            return ok({ ...agent, folderId: null, deletedAt: new Date().toISOString() });
        },
        getAgentSource: async ({ params, state }) => {
            const agent = await this.agent(String(params.agentId), state);
            if (!agent) return fail('not-found');
            if (agent.origin === 'system') return ok({ agentId: agent.id, revisionId: agent.currentRevisionId, source: '', updatedAt: agent.updatedAt });
            const source = await this.agenda.bookSource({ reference: this.agentNames.get(agent.id) ?? agent.name });
            return ok({ agentId: agent.id, revisionId: agent.currentRevisionId, source: source.text, updatedAt: agent.updatedAt });
        },
        getAgentStatus: async ({ params }) => {
            const status = this.agentStatus(String(params.agentId));
            return status ? ok(status) : fail('not-found');
        },
        // Agents of a project engine work when there is work for them: start and stop answer the current status.
        startAgent: async ({ params }) => {
            const status = this.agentStatus(String(params.agentId));
            return status ? ok(status) : fail('not-found');
        },
        stopAgent: async ({ params }) => {
            const status = this.agentStatus(String(params.agentId));
            return status ? ok(status) : fail('not-found');
        },
        streamEvents: async ({ signal }) => ok(this.eventStream(signal)),
        listFolders: async ({ query, state }) => page(state.folders(), query),
        createFolder: async ({ body, state }) => {
            const folder = await state.createFolder((body as { name: string }).name);
            return folder ? ok(folder) : fail('name-taken');
        },
        renameFolder: async ({ params, body, state }) => {
            const renamed = await state.renameFolder(String(params.folderId), (body as { name: string }).name);
            return renamed === undefined ? fail('not-found') : renamed === 'taken' ? fail('name-taken') : ok(renamed);
        },
        deleteFolder: async ({ params, state }) => {
            const live = new Set((await this.agents(state)).map((agent) => agent.id));
            const outcome = await state.deleteFolder(String(params.folderId), live);
            return outcome === 'missing' ? fail('not-found') : outcome === 'not-empty' ? fail('folder-not-empty') : ok(null);
        },
        listChats: async ({ query }) => {
            let summaries = (await this.deps.agenda?.chatList()) ?? [];
            if (typeof query.agentId === 'string') summaries = summaries.filter((summary) => this.members(summary).some((member) => member.key === query.agentId));
            if (typeof query.q === 'string') {
                const needle = query.q.toLowerCase();
                summaries = summaries.filter((summary) => summary.title.toLowerCase().includes(needle) || summary.name.toLowerCase().includes(needle));
            }
            const chats = await Promise.all(summaries.map((summary) => this.chat(summary)));
            chats.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)) || String(a.id).localeCompare(String(b.id)));
            return page(chats, query);
        },
        listAgentChats: async ({ params, query, state }) => {
            if (!(await this.agent(String(params.agentId), state))) return fail('not-found');
            const summaries = (await this.agenda.chatList()).filter((summary) => this.members(summary).some((member) => member.key === params.agentId));
            const chats = await Promise.all(summaries.map((summary) => this.chat(summary)));
            chats.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)) || String(a.id).localeCompare(String(b.id)));
            return page(chats, query);
        },
        getChat: async ({ params }) => {
            const found = await this.chatByName(String(params.chatId));
            return found ? ok(await this.chat(found.summary, found.detail)) : fail('not-found');
        },
        listChatEntries: async ({ params, query, state }) => {
            const found = await this.chatByName(String(params.chatId));
            if (!found) return fail('not-found');
            // Newest first: the first page is the end of the thread.
            return page((await this.entries(found.summary, found.detail, state)).reverse(), query);
        },
        createChat: async ({ body, state }) => {
            const input = body as { agentId?: string; title?: string; requestKey?: string };
            let reference: string;
            if (input.agentId) {
                const agent = await this.agent(input.agentId, state);
                if (!agent) return fail('not-found');
                reference = this.agentNames.get(agent.id) ?? agent.name;
            } else {
                const chatter = this.agenda.snapshot().agents.find((agent) => normalizeAgentName(agent.name) === 'chatter');
                if (!chatter) return fail('chatter-missing');
                reference = chatter.name;
            }
            const { name } = await this.agenda.chatOpen(reference, { ...(input.title ? { title: input.title } : {}), ...(input.requestKey ? { requestKey: input.requestKey } : {}) });
            const found = await this.chatByName(name);
            return found ? ok(await this.chat(found.summary, found.detail)) : fail('internal-error');
        },
        sendChatMessage: async ({ actor, params, body, state }) => {
            const input = body as { content: string; requestKey?: string };
            const name = String(params.chatId);
            const found = await this.chatByName(name);
            if (!found) return fail('not-found');
            const digest = textDigest(input.content);
            if (input.requestKey) {
                const sent = state.sentKey(input.requestKey);
                if (sent) {
                    const position = this.position(sent.chatId, sent.messageId);
                    const stored = position ? found.detail.messages[position - 1] : undefined;
                    if (sent.chatId !== name || sent.digest !== digest || !stored || !position) return fail('request-key-reused');
                    return ok({ message: this.message(name, position, stored, state, (await this.chatTimes(found.summary)).createdAt) });
                }
            }
            const written = await this.agenda.chatSend(name, input.content, { via: 'the App' });
            const position = written.chat.messages.length;
            const messageId = `${name}#${String(position)}`;
            await state.recordMessageAuthor(messageId, actor.memberId);
            if (input.requestKey) await state.recordSentKey(input.requestKey, { chatId: name, digest, messageId, at: new Date().toISOString() });
            const stored = written.chat.messages[position - 1]!;
            return ok({ message: this.message(name, position, stored, state, new Date().toISOString()) });
        },
        markChatRead: async ({ params }) => {
            const name = String(params.chatId);
            if (!(await this.chatByName(name))) return fail('not-found');
            await this.agenda.chatRead(name);
            const found = await this.chatByName(name);
            return found ? ok(await this.chat(found.summary, found.detail)) : fail('not-found');
        },
        markChatSeen: async ({ params, body }) => {
            const name = String(params.chatId);
            if (!(await this.chatByName(name))) return fail('not-found');
            const positions = (body as { messageIds: string[] }).messageIds.map((id) => this.position(name, id)).filter((position): position is number => position !== undefined);
            if (positions.length) await this.agenda.chatSeen(name, positions);
            const found = await this.chatByName(name);
            return found ? ok(await this.chat(found.summary, found.detail)) : fail('not-found');
        },
        streamChatReply: async ({ params, lastEventId, signal }) => {
            const name = String(params.chatId);
            const found = await this.chatByName(name);
            const position = this.position(name, String(params.messageId));
            if (!found || !position || position > found.detail.messages.length + (found.detail.live ? 1 : 0)) return fail('not-found');
            const after = lastEventId && /^\d{1,9}$/.test(lastEventId) ? Number(lastEventId) : 0;
            return ok(this.replyStream(name, position, after, signal));
        },
        cancelChatReply: async ({ params }) => {
            const name = String(params.chatId);
            const found = await this.chatByName(name);
            const position = this.position(name, String(params.messageId));
            if (!found || !position) return fail('not-found');
            if (position <= found.detail.messages.length) return fail('reply-finished');
            // A reply in progress finishes as one unit of the engine; it cannot be interrupted from here.
            return found.detail.live && position === found.detail.messages.length + 1 ? fail('unavailable') : fail('not-found');
        },
        listMembers: async ({ access, query }) => page([...access.members()].sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id)).map((member) => this.member(member, access)), query),
        getMember: async ({ access, params }) => {
            const member = access.member(String(params.memberId));
            return member && member.status === 'active' ? ok(this.member(member, access)) : fail('not-found');
        },
        listPasskeys: async ({ access, query }) => page(access.passkeys(typeof query.memberId === 'string' ? query.memberId : undefined).map((passkey) => this.passkey(passkey)), query),
        revokePasskey: async ({ access, params }) => ((await access.revokePasskey(String(params.passkeyId))) ? ok(null) : fail('not-found')),
        listSessions: async ({ actor, access, query }) => page(access.sessions(typeof query.memberId === 'string' ? query.memberId : undefined).map((session) => this.session(session, actor)), query),
        revokeSession: async ({ access, params }) => ((await access.revokeSessions((session) => session.id === params.sessionId)) ? ok(null) : fail('not-found')),
        getSettings: async ({ state }) => ok(this.settings(state)),
        updateSettings: async ({ body, state }) => {
            const input = body as { name?: string; defaultAgentVisibility?: AgentVisibility };
            await state.updateSettings({ ...(input.name !== undefined ? { name: input.name } : {}), ...(input.defaultAgentVisibility ? { defaultAgentVisibility: input.defaultAgentVisibility } : {}) });
            return ok(this.settings(state));
        },
        setUpdatePolicy: async ({ body, state }) => {
            const policy = (body as { policy: string }).policy;
            if (policy === 'pinned') return fail('validation-failed', { errors: [{ path: 'body.policy', message: 'This engine follows its update channel; pinning a version is not supported.' }] });
            await this.agenda.setAutoUpdate(policy === 'auto');
            return ok(this.settings(state));
        },
        getSecurityOverview: async () => ok(this.security()),
        listActivity: async ({ query }) => page([], query),
    };
}

/**
 * Problems are plain objects; this keeps the type importable for handlers elsewhere.
 *
 * @private App engine API
 */
export type EngineApiProblem = ContractProblem;
