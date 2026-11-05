import { PtbkError } from '../common/errors.js';
import type { HarnessContext, HarnessPlugin, McpServerLaunch } from './types.js';

/**
 * Readiness of one harness instance for a realtime voice call. `not-implemented` is the shared result of adapters
 * without a voice implementation; runtime unavailability of an implemented adapter is `unavailable` (or `unknown`
 * when it cannot be observed without opening a paid call).
 *
 * @private harness voice capability
 */
export type VoiceReadiness = 'ready' | 'unavailable' | 'unknown' | 'not-implemented';

/**
 * The remedy of a voice availability problem, so guidance never sends the user through the wrong setup again.
 *
 * @private harness voice capability
 */
export type VoiceSetupKind = 'install' | 'login' | 'update' | 'enable' | 'entitlement' | 'provider' | 'add-supported';

/**
 * What an implemented voice adapter actually supports through its current integration.
 *
 * @private harness voice capability
 */
export type VoiceFeatures = {
    /** Transcripts of the user's speech are delivered. */
    readonly inputTranscripts: boolean;
    /** Transcripts of the spoken output are delivered. */
    readonly outputTranscripts: boolean;
    /** How spoken output is cut off when the user speaks over it: by the provider's turn detection, or not at all. */
    readonly interruption: 'provider' | 'none';
    /** Negotiated media path: a WebRTC connection owned by the media page (`webrtc`). */
    readonly transport: 'webrtc';
    /** Whether utterances are handed to the backing session natively (`native`) or must be dispatched by the engine. */
    readonly dispatch: 'native' | 'engine';
    /** Limitations shown to the operator. */
    readonly notes: readonly string[];
};

/**
 * Normalized voice availability of one registered harness instance. Ordinary inspection never opens a paid call.
 *
 * @private harness voice capability
 */
export type VoiceAvailability = {
    /** Plugin identifier. */
    readonly harness: string;
    /** Display name. */
    readonly displayName: string;
    /** The registered instance (absent for a catalog-level probe). */
    readonly tool?: string;
    /** Whether the adapter implements realtime voice at all. */
    readonly implemented: boolean;
    /** Readiness. */
    readonly state: VoiceReadiness;
    /** Concrete reason, in the words shown to the operator. */
    readonly reason: string;
    /** The applicable next action. */
    readonly setup?: { readonly kind: VoiceSetupKind; readonly text: string };
    /** Observed installed version. */
    readonly version?: string;
    /** Observed native account context (never a credential). */
    readonly account?: string;
    /** Actual capabilities (implemented adapters). */
    readonly features?: VoiceFeatures;
    /** Whether the account's realtime entitlement is proven (only a started call proves it). */
    readonly entitlement?: 'unverified' | 'verified';
    /** Observation time (epoch ms). */
    readonly checkedAt: number;
};

/**
 * Normalized realtime voice events. Provider protocols and model names stay inside the adapter.
 *
 * @private harness voice capability
 */
export type VoiceEvent =
    /** The provider accepted the session (it now listens). */
    | { readonly type: 'started'; readonly session?: string; readonly version?: string }
    /** Provisional transcript text (never an accepted message). */
    | { readonly type: 'caption'; readonly role: 'user' | 'assistant'; readonly delta: string }
    /** One finalized transcript part. */
    | { readonly type: 'transcript'; readonly role: 'user' | 'assistant'; readonly text: string }
    /** Provider-native usage (cumulative observations supersede earlier ones). */
    | { readonly type: 'usage'; readonly usage: Readonly<Record<string, number>>; readonly semantics: 'delta' | 'cumulative' }
    /** A provider error; the session may continue. */
    | { readonly type: 'error'; readonly text: string }
    /** The provider session ended. */
    | { readonly type: 'closed'; readonly outcome: 'ended' | 'failed'; readonly reason?: string };

/**
 * What a voice session is started with: the owning chat agent's effective context, never a new anonymous agent.
 *
 * @private harness voice capability
 */
export type VoiceStartRequest = {
    /** The selected instance's scoped native context. */
    readonly context: HarnessContext;
    /** Effective instructions of the speaking agent in this chat (role, project, conversation so far). */
    readonly instructions: string;
    /** Instructions of the voice frontend: who it speaks as and how it hands work to the backing session. */
    readonly voiceInstructions: string;
    /** The media page's WebRTC offer (microphone track and events channel); media never passes through the engine. */
    readonly offer: string;
    /** Recent chat history seeding the voice frontend (complete messages, oldest first). */
    readonly history?: ReadonlyArray<{ readonly role: 'user' | 'assistant'; readonly text: string }>;
    /** The chat's tools through the ptbk MCP bridge (the same authority as a written reply). */
    readonly mcp?: McpServerLaunch;
    /** Backing model (undefined: the harness default). */
    readonly model?: string;
    /** Normalized events. */
    readonly onEvent: (event: VoiceEvent) => void;
    /** Raw adapter diagnostics (never credentials). */
    readonly onLog?: (line: string) => void;
};

/**
 * A live provider voice session.
 *
 * @private harness voice capability
 */
export type VoiceSession = {
    /** The path that accepts utterances: `native` means saving their transcripts must not run a text reply again. */
    readonly dispatch: 'native' | 'engine';
    /** The provider's WebRTC answer for the media page. */
    readonly answer: string;
    /** Supplies a later chat message or backend outcome as context, without a duplicate turn. */
    readonly supplyContext: (text: string) => Promise<void>;
    /** Ends the provider session and releases its resources (idempotent). */
    readonly end: () => Promise<void>;
};

/**
 * The realtime voice part of the plugin contract.
 *
 * @private harness voice capability
 */
export type HarnessVoiceSupport = {
    /** Inspects availability (bounded, never a paid call). */
    readonly inspect: (context: HarnessContext) => Promise<VoiceAvailability>;
    /** Starts a session, revalidating readiness; a typed failure otherwise. */
    readonly start: (request: VoiceStartRequest) => Promise<VoiceSession>;
};

/**
 * A voice operation that the adapter does not implement, or that is unavailable at runtime.
 *
 * @private harness voice capability
 */
export class VoiceUnavailableError extends PtbkError {
    public constructor(public readonly availability: VoiceAvailability) {
        const kind = availability.state === 'not-implemented' ? 'unsupported' : availability.setup?.kind === 'login' ? 'authentication' : availability.setup?.kind === 'install' || availability.setup?.kind === 'update' || availability.setup?.kind === 'enable' ? 'setup' : 'configuration';
        super(availability.reason, { kind, harness: availability.harness, next: availability.setup ? [availability.setup.text] : undefined, data: { voice: availability } });
    }
}

/**
 * The shared not-implemented voice result of an adapter: every operation says so, never a silent success or a fake
 * audio session.
 *
 * @private harness voice capability
 */
export function unsupportedVoice(plugin: Pick<HarnessPlugin, 'id' | 'displayName'>): HarnessVoiceSupport {
    const availability = (context?: HarnessContext): VoiceAvailability => ({
        harness: plugin.id,
        displayName: plugin.displayName,
        ...(context?.tool ? { tool: context.tool.name } : {}),
        implemented: false,
        state: 'not-implemented',
        reason: `Realtime voice is not implemented for ${plugin.displayName} in ptbk yet.`,
        setup: { kind: 'add-supported', text: 'Use a voice-capable harness: OpenAI Codex signed in with a ChatGPT account (ptbk tool add HARNESS --variant OPENAI_CODEX).' },
        checkedAt: Date.now(),
    });
    return {
        inspect: async (context) => availability(context),
        start: async (request) => {
            throw new VoiceUnavailableError(availability(request.context));
        },
    };
}

/**
 * The voice capability of a plugin: its implementation, or the shared not-implemented result.
 *
 * @private harness voice capability
 */
export function voiceSupport(plugin: HarnessPlugin): HarnessVoiceSupport & { readonly implemented: boolean } {
    return plugin.voice ? { ...plugin.voice, implemented: true } : { ...unsupportedVoice(plugin), implemented: false };
}

/**
 * Whether a process runs in a remote SSH session, whose terminal cannot carry this computer's microphone.
 *
 * @private harness voice capability
 */
export function remoteTerminal(env: NodeJS.ProcessEnv): boolean {
    return Boolean(env.SSH_CONNECTION || env.SSH_TTY || env.SSH_CLIENT);
}
