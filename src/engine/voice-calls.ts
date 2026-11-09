import { join } from 'node:path';
import { PtbkError } from '../common/errors.js';
import { ensureDirectory, readJsonIfExists, writeFileAtomic, writeJsonAtomic } from '../common/fs.js';
import { formatAgentReference } from '../book/references.js';
import { voiceContext, voiceSpeaker, type ConversationContext } from '../chats/conversation.js';
import type { ChatMessage } from '../chats/chat-book.js';
import { VOICE_LEASE_MS, VoiceCall, type VoiceCallView } from '../chats/voice-call.js';
import { harnessPlugin } from '../harness/registry.js';
import type { ToolBridge } from './bridge.js';
import { VoiceUnavailableError, voiceSupport, type VoiceAvailability } from '../harness/voice.js';
import { harnessPluginId } from '../tools/model.js';
import { appendUsage, chatUsageFile, usageRecords } from './usage.js';
import { nameKey } from '../tasks/model.js';

/**
 * Availability of voice for one chat: every enabled registered instance, the chosen ready one and the guidance when
 * none is ready.
 *
 * @private voice calls
 */
export type VoiceAvailabilityReport = {
    /** The chat. */
    readonly chat: string;
    /** The speaking agent. */
    readonly agent: string;
    /** Every registered instance's result (enabled ones inspected; disabled implemented ones offered for enabling). */
    readonly instances: ReadonlyArray<VoiceAvailability & { readonly enabled: boolean; readonly permitted: boolean }>;
    /** The instance a call would use now. */
    readonly selected?: string;
    /** One actionable explanation when no instance is ready. */
    readonly guidance?: string;
};

/**
 * What the voice manager needs from its engine.
 *
 * @private voice calls
 */
export type VoiceCallsHost = {
    /** The shared conversation context (tools, catalog, pool, chats). */
    readonly conversation: () => ConversationContext;
    /** Clients refresh. */
    readonly onChange: () => void;
    /** Activity log. */
    readonly log: (text: string) => void;
    /** Where runtime state lives (`.ptbk/state`). */
    readonly stateDirectory: string;
};

/**
 * How long an availability inspection is reused (inspection never opens a paid call, but starts a process).
 */
const AVAILABILITY_TTL_MS = 60_000;

/**
 * What a media surface delivers in one ordered batch.
 *
 * @private voice calls
 */
export type VoiceMediaInput = {
    /** The surface attached (first open or a recovered connection). */
    readonly attach?: boolean;
    /** Messages and recorded audio (base64 mono Int16LE PCM at `rate`), in the order the surface produced them. */
    readonly items?: ReadonlyArray<{ readonly kind: 'message'; readonly message: Readonly<Record<string, unknown>> } | { readonly kind: 'audio'; readonly side: 'user' | 'agent'; readonly rate: number; readonly data: string }>;
    /** The surface went away (true, or the reason). */
    readonly detach?: boolean | string;
};

/**
 * Persisted turns handled by native voice (spoken or supplied typed context): chat key → last accepted message.
 */
type DispatchedState = { readonly version: 1; readonly chats: Record<string, number> };

/**
 * The engine's voice calls: at most one live call per chat, started explicitly from a terminal chat, driven by the
 * common harness voice capability and persisted through ordinary chat operations. Utterances accepted by the native
 * voice path are recorded so the ordinary text reply never answers them again (also after a restart).
 *
 * @private voice calls
 */
export class VoiceCalls {
    private readonly calls = new Map<string, VoiceCall>();
    private readonly inspections = new Map<string, VoiceAvailability>();
    private dispatched?: DispatchedState;
    /** Message counts each live call has delivered or seen, for context delivery. */
    private readonly known = new Map<string, number>();

    public constructor(private readonly host: VoiceCallsHost) {}

    /** The live (or just ended) call of a chat. */
    public view(chat: string): VoiceCallView | undefined {
        return this.calls.get(nameKey(chat))?.view();
    }

    /** Every live call. */
    public live(): VoiceCallView[] {
        return [...this.calls.values()].filter((call) => !call.over).map((call) => call.view());
    }

    /**
     * Inspects every registered harness instance for this chat: implemented, permitted by the chat's MODEL and ready.
     */
    public async availability(chatName: string, options: { readonly fresh?: boolean } = {}): Promise<VoiceAvailabilityReport> {
        const context = this.host.conversation();
        const speaker = await voiceSpeaker(context, chatName);
        const instances: Array<VoiceAvailability & { enabled: boolean; permitted: boolean }> = [];
        for (const tool of context.pool.allInstances()) {
            const plugin = harnessPlugin(harnessPluginId(tool.variant));
            if (!plugin) continue;
            const support = voiceSupport(plugin);
            const permitted = speaker.permits(plugin.id);
            if (!tool.isEnabled) {
                // A disabled implemented instance is offered for enabling; disabled others are irrelevant.
                if (support.implemented) instances.push({ harness: plugin.id, displayName: plugin.displayName, tool: tool.name, implemented: true, state: 'unavailable', reason: `${tool.name} is disabled.`, setup: { kind: 'enable', text: `Enable it: ptbk tool enable ${tool.name}` }, checkedAt: Date.now(), enabled: false, permitted });
                continue;
            }
            const cached = this.inspections.get(tool.name);
            const result = !options.fresh && cached && Date.now() - cached.checkedAt < AVAILABILITY_TTL_MS ? cached : await support.inspect(context.pool.context(tool.name));
            if (support.implemented) this.inspections.set(tool.name, result);
            instances.push({ ...result, tool: tool.name, enabled: true, permitted });
        }
        const selected = instances.find((instance) => instance.enabled && instance.permitted && instance.state === 'ready');
        return { chat: speaker.stored.chat.name, agent: speaker.reference, instances, ...(selected ? { selected: selected.tool } : { guidance: guidance(instances, speaker.reference, speaker.model) }) };
    }

    /**
     * Starts a voice call in an existing chat (one per chat; a live one is returned again to its own controlling
     * client, never a second paid call). Returns the call and the scoped media grant of its one media owner, given only
     * to the client that started it; another client sees the live call but cannot become a second input owner.
     */
    public async start(chatName: string, controller?: string): Promise<{ readonly call: VoiceCallView; readonly grant: string }> {
        const existing = this.calls.get(nameKey(chatName));
        if (existing && !existing.over) {
            if (existing.controller !== controller) throw new PtbkError(`Voice is already live in {${chatName}} from another terminal or window.`, { kind: 'conflict', effect: 'Text chat keeps working; end the call there first.' });
            existing.heartbeat();
            return { call: existing.view(), grant: existing.grant };
        }
        const report = await this.availability(chatName, { fresh: true });
        if (!report.selected) throw new PtbkError(report.guidance ?? 'No voice-capable harness is ready.', { kind: 'setup', effect: 'Text chat keeps working.', data: { voice: report } });
        const context = this.host.conversation();
        const speaker = await voiceSpeaker(context, chatName);
        const tool = context.pool.instance(report.selected)!;
        const plugin = harnessPlugin(harnessPluginId(tool.variant))!;
        /** The chat's tools of the current provider session (prepared again after a page reload). */
        let tools: ToolBridge | undefined;
        const call = new VoiceCall(
            speaker.stored.chat.name,
            speaker.agent.name,
            plugin.id,
            tool.name,
            {
                connect: async (offer, onEvent) => {
                    await tools?.close().catch(() => undefined);
                    tools = undefined;
                    // The current chat (including what was said so far) seeds the session; readiness is revalidated.
                    const fresh = this.host.conversation();
                    const current = await voiceSpeaker(fresh, chatName);
                    const prepared = await voiceContext(fresh, current.stored, current.agent, { id: plugin.id, mcp: plugin.capabilities.mcp });
                    tools = prepared.bridge;
                    const history = current.stored.chat.messages.filter((message) => message.phase !== 'progress').map((message) => ({ role: message.senderKey === 'user' ? ('user' as const) : ('assistant' as const), text: message.text }));
                    try {
                        const session = await voiceSupport(plugin).start({
                            context: fresh.pool.context(tool.name),
                            instructions: prepared.instructions,
                            voiceInstructions: prepared.voiceInstructions,
                            offer,
                            history,
                            ...(tools ? { mcp: tools.launch() } : {}),
                            onEvent,
                            onLog: (line) => this.host.log(`Voice adapter: ${tools ? line.split(tools.secret).join('[REDACTED]') : line}`),
                        });
                        const known = this.inspections.get(tool.name);
                        if (known) this.inspections.set(tool.name, { ...known, entitlement: 'verified' });
                        return session;
                    } catch (error) {
                        await tools?.close().catch(() => undefined);
                        tools = undefined;
                        this.inspections.delete(tool.name);
                        if (error instanceof VoiceUnavailableError) throw new Error(`${error.message}${error.availability.setup ? ` ${error.availability.setup.text}` : ''}`);
                        throw error;
                    }
                },
                append: async (chat, role, text, id) => {
                    const written = await context.chats.append(chat, { sender: role === 'user' ? '@User' : formatAgentReference(speaker.agent.name), text }, { trailers: { 'Chat-Voice': id } });
                    const position = written.chat.messages.length;
                    if (role === 'user') await this.markDispatched(chat, position);
                    this.known.set(nameKey(chat), position);
                    return position;
                },
                record: async (chat, message, segments) => {
                    const recorded = await context.chats.recordAudio(chat, message, segments);
                    return { problems: recorded.archive.problems };
                },
                keepUntranscribed: async (chat, segment) => {
                    if (!segment.data) return undefined;
                    const directory = await ensureDirectory(join(context.project.runtime.state, 'voice-untranscribed', nameKey(chat)));
                    const file = join(directory, `audio-${segment.id}.${segment.extension}`);
                    await writeFileAtomic(file, segment.data);
                    return file;
                },
                onChange: () => this.host.onChange(),
                log: (text) => this.host.log(text),
            },
            {
                // Fixtures shorten how long a closed page or a silent terminal keeps a call (behavior is unchanged).
                pageGraceMs: Number(context.env.PTBK_VOICE_PAGE_GRACE_MS) || 8_000,
                leaseMs: Number(context.env.PTBK_VOICE_LEASE_MS) || VOICE_LEASE_MS,
            },
        );
        this.calls.set(nameKey(chatName), call);
        this.known.set(nameKey(chatName), speaker.stored.chat.messages.length);
        const grant = call.open(controller);
        const startedAt = new Date().toISOString();
        void this.untilOver(call).then(async () => {
            await tools?.close().catch(() => undefined);
            if (!call.connected && !call.view().accepted) return;
            const usage = call.usageSnapshot();
            const records = usageRecords({ observations: usage.usage ? [{ at: new Date().toISOString(), usage: usage.usage, semantics: 'cumulative' }] : [], startedAt, harness: plugin.id, tool: tool.name, authentication: 'account', outcome: `voice-call ${usage.seconds}s`, attribution: { agent: speaker.agent.name, owner: speaker.agent.name, initiator: 'User', work: { kind: 'chat', chat: speaker.stored.chat.name, run: call.id } } });
            await appendUsage(chatUsageFile(context.project, speaker.stored.path), records).catch(() => undefined);
        });
        this.host.log(`Voice call opened in {${speaker.stored.chat.name}} with ${speaker.agent.name} through ${tool.name}; waiting for its media surface.`);
        return { call: call.view(), grant };
    }

    /** The live call of a chat for its media owner (refused without the call's grant). */
    private owned(chatName: string, grant: string): VoiceCall {
        const call = this.calls.get(nameKey(chatName));
        if (!call || !call.authorized(grant)) throw new PtbkError(`No voice call of {${chatName}} belongs to this media surface.`, { kind: 'not-found' });
        return call;
    }

    /**
     * Delivers what the media surface of a call reports, in order: attachment and detachment, its messages (device and
     * playback state, the WebRTC offer, barge-in) and recorded audio of both sides.
     */
    public media(chatName: string, grant: string, input: VoiceMediaInput): VoiceCallView {
        const call = this.owned(chatName, grant);
        if (input.attach) call.mediaAttached();
        for (const item of input.items ?? []) {
            if (item.kind === 'message' && item.message && typeof item.message === 'object') call.mediaMessage(item.message);
            else if (item.kind === 'audio' && (item.side === 'user' || item.side === 'agent') && typeof item.data === 'string') call.mediaAudio(item.side, Buffer.from(item.data, 'base64'), Number(item.rate));
        }
        if (input.detach) call.mediaDetached(typeof input.detach === 'string' ? input.detach : undefined);
        return call.view();
    }

    /** Events for the media surface after `after` (a bounded long poll). */
    public async mediaEvents(chatName: string, grant: string, after: number, waitMs: number): Promise<{ readonly events: ReadonlyArray<{ readonly seq: number; readonly event: Readonly<Record<string, unknown>> }>; readonly over: boolean }> {
        return await this.owned(chatName, grant).mediaEvents(after, Math.max(0, Math.min(waitMs, 25_000)));
    }

    /** Resolves once a call is over. */
    private async untilOver(call: VoiceCall): Promise<void> {
        while (!call.over) await new Promise((resolve) => setTimeout(resolve, 500).unref());
    }

    /** Applies a terminal control to the chat's live call. */
    public async control(chatName: string, action: 'end' | 'mute-mic' | 'unmute-mic' | 'mute-output' | 'unmute-output'): Promise<VoiceCallView> {
        const call = this.calls.get(nameKey(chatName));
        if (!call || call.over) throw new PtbkError(`No voice call is live in {${chatName}}.`, { kind: 'not-found' });
        if (action === 'end') await call.end('Ended from the terminal.');
        else call.control(action);
        return call.view();
    }

    /** Renews the controlling terminal's lease of the chat's call. */
    public heartbeat(chatName: string): VoiceCallView | undefined {
        const call = this.calls.get(nameKey(chatName));
        if (!call || call.over) return call?.view();
        call.heartbeat();
        return call.view();
    }

    /** Ends every live call (engine Stop, force stop, panic). */
    public async endAll(reason: string): Promise<void> {
        await Promise.all([...this.calls.values()].filter((call) => !call.over).map(async (call) => await call.end(reason)));
    }

    /**
     * Delivers chat messages that arrived during a live call from elsewhere (typed text, written replies, task results)
     * to the voice session as context, once; the call's own utterances are skipped.
     */
    public async observe(chatName: string, messages: readonly Pick<ChatMessage, 'sender' | 'senderKey' | 'text' | 'phase'>[]): Promise<void> {
        const key = nameKey(chatName);
        const call = this.calls.get(key);
        if (!call || call.over) return;
        const from = this.known.get(key) ?? messages.length;
        this.known.set(key, Math.max(from, messages.length));
        for (let index = from; index < messages.length; index++) {
            const message = messages[index]!;
            if (call.own.has(index + 1) || message.phase === 'progress') continue;
            // A typed user message delivered to native voice is handled by that conversation, not by a
            // second ordinary text reply. Persist this before chatSend decides whether a reply is needed.
            const delivered = await call.supply(`New message in the chat from ${message.sender} (not spoken): ${message.text.slice(0, 4_000)}`);
            if (delivered && message.senderKey === 'user') await this.markDispatched(chatName, index + 1);
        }
    }

    /** Spoken or externally supplied user messages handled by native voice (no second text reply). */
    public async nativelyAccepted(chatName: string): Promise<number> {
        return (await this.state()).chats[nameKey(chatName)] ?? 0;
    }

    /** Records that the voice path accepted the chat's messages up to this position. */
    private async markDispatched(chatName: string, position: number): Promise<void> {
        const state = await this.state();
        state.chats[nameKey(chatName)] = Math.max(state.chats[nameKey(chatName)] ?? 0, position);
        await writeJsonAtomic(join(this.host.stateDirectory, 'voice-dispatch.json'), state).catch(() => undefined);
    }

    /** Persisted dispatch state. */
    private async state(): Promise<DispatchedState & { chats: Record<string, number> }> {
        if (!this.dispatched) this.dispatched = (await readJsonIfExists<DispatchedState>(join(this.host.stateDirectory, 'voice-dispatch.json')).catch(() => undefined)) ?? { version: 1, chats: {} };
        return this.dispatched as DispatchedState & { chats: Record<string, number> };
    }
}

/**
 * One explanation for a chat without a ready voice instance, choosing the remedy that applies: a model/role
 * incompatibility, enabling, signing in, updating, entitlement, or adding a supported harness at all.
 *
 * @private voice calls
 */
export function guidance(instances: VoiceAvailabilityReport['instances'], agent: string, model: string): string {
    const implemented = instances.filter((instance) => instance.implemented);
    const blocked = implemented.find((instance) => instance.enabled && !instance.permitted && instance.state === 'ready');
    if (blocked && !implemented.some((instance) => instance.enabled && instance.permitted)) return `${blocked.tool} could speak, but ${agent}'s and this chat's MODEL (${model}) do not permit ${blocked.displayName}. Change the MODEL or talk in text.`;
    const actionable = implemented.find((instance) => instance.enabled && instance.permitted && instance.state !== 'ready');
    if (actionable) return `${actionable.tool ?? actionable.displayName}: ${actionable.reason}${actionable.setup ? ` ${actionable.setup.text}` : ''}`;
    const disabled = implemented.find((instance) => !instance.enabled);
    if (disabled) return `${disabled.reason} ${disabled.setup?.text ?? ''}`.trim();
    return 'No registered harness supports realtime voice yet. Add OpenAI Codex and sign in with ChatGPT through Tools (ptbk tool add HARNESS --variant OPENAI_CODEX); text chat keeps working.';
}
