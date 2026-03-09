import type { SpeechRecognitionErrorCode } from '../../../../../src/types/SpeechRecognition';

/**
 * Stable identifier of one speech-to-text provider implementation.
 */
export type SpeechToTextProviderId = 'openai-whisper-proxy' | 'browser-web-speech';

/**
 * Structured provider error forwarded to the failover orchestrator.
 */
export type SpeechToTextProviderError = {
    /**
     * Provider-specific or normalized machine-readable code.
     */
    readonly code: SpeechRecognitionErrorCode;

    /**
     * Human-readable description for logs and UI.
     */
    readonly message: string;

    /**
     * Indicates whether re-trying on the same provider can help.
     */
    readonly isRetryable: boolean;

    /**
     * Raw unknown error payload for diagnostics only.
     */
    readonly cause?: unknown;
};

/**
 * Optional runtime diagnostics exposed by a provider.
 */
export type SpeechToTextProviderDiagnostics = {
    /**
     * Provider identifier.
     */
    readonly providerId: SpeechToTextProviderId;

    /**
     * Whether the provider can emit low-latency partial transcripts.
     */
    readonly supportsPartials: boolean;

    /**
     * Human-readable browser limitations summary.
     */
    readonly limitations?: string;

    /**
     * Last measured normalized audio level (`0`..`1`) when available.
     */
    readonly audioLevel?: number;
};

/**
 * Callback bundle used while one provider session is active.
 */
export type SpeechToTextProviderStartOptions = {
    /**
     * Optional BCP-47 language tag.
     */
    readonly language?: string;

    /**
     * Enables a more sensitive voice-detection profile.
     */
    readonly whisperMode?: boolean;

    /**
     * Emits low-latency partial text updates.
     */
    readonly onPartial: (text: string) => void;

    /**
     * Emits finalized transcript chunks.
     */
    readonly onFinal: (text: string) => void;

    /**
     * Emits provider failures.
     */
    readonly onError: (error: SpeechToTextProviderError) => void;

    /**
     * Emits provider lifecycle start signal once recording is active.
     */
    readonly onStart: () => void;

    /**
     * Emits provider lifecycle stop signal when recording session ends.
     */
    readonly onStop: () => void;

    /**
     * Emits processing/transcribing state transitions.
     */
    readonly onProcessing: () => void;
};

/**
 * Factory signature used by the failover orchestrator.
 */
export type SpeechToTextProviderFactory = () => SpeechToTextProvider;

/**
 * Shared speech-to-text provider abstraction consumed by failover orchestration.
 */
export type SpeechToTextProvider = {
    /**
     * Stable provider identifier.
     */
    readonly id: SpeechToTextProviderId;

    /**
     * Checks if the provider is usable in the current runtime/browser.
     */
    isSupported(): boolean;

    /**
     * Starts one dictation session.
     */
    start(options: SpeechToTextProviderStartOptions): Promise<void>;

    /**
     * Gracefully stops one dictation session.
     */
    stop(): void;

    /**
     * Immediately aborts one dictation session.
     */
    abort(): void;

    /**
     * Returns provider diagnostics for telemetry and UI hints.
     */
    getDiagnostics?(): SpeechToTextProviderDiagnostics;
};
