import type {
    SpeechRecognition,
    SpeechRecognitionErrorCode,
    SpeechRecognitionEvent,
    SpeechRecognitionStartOptions,
    SpeechRecognitionState,
} from '../../../../../src/types/SpeechRecognition';
import type {
    SpeechToTextProvider,
    SpeechToTextProviderDiagnostics,
    SpeechToTextProviderFactory,
} from './SpeechToTextProvider';

/**
 * Interval used by the stall watchdog.
 */
const DEFAULT_STALL_CHECK_INTERVAL_MS = 1000;

/**
 * Timeout after which missing partials are considered a stall.
 */
const DEFAULT_STALL_TIMEOUT_MS = 6000;

/**
 * How recently audio activity must be detected to classify a stall as actionable.
 */
const AUDIO_ACTIVITY_RECENCY_MS = 2500;

/**
 * Grace period after requesting stop before forcing idle fallback.
 */
const STOP_GRACE_TIMEOUT_MS = 2500;

/**
 * Minimum normalized audio level treated as non-silent input.
 */
const ACTIVE_AUDIO_LEVEL_THRESHOLD = 0.02;

/**
 * FFT size used by the background activity monitor.
 */
const AUDIO_MONITOR_FFT_SIZE = 2048;

/**
 * Midpoint of unsigned 8-bit PCM analyzer data.
 */
const PCM_U8_MIDPOINT = 128;

/**
 * Payload forwarded through speech telemetry hooks.
 */
export type SpeechToTextTelemetryEvent = {
    /**
     * Event category.
     */
    readonly type:
        | 'provider-selected'
        | 'provider-unsupported'
        | 'provider-init'
        | 'provider-failover'
        | 'provider-restart'
        | 'first-partial'
        | 'final'
        | 'error';

    /**
     * Provider identifier if available.
     */
    readonly providerId?: string;

    /**
     * Milliseconds since session start.
     */
    readonly elapsedMs?: number;

    /**
     * Optional machine-readable error code.
     */
    readonly code?: string;

    /**
     * Optional detail for diagnostics.
     */
    readonly detail?: string;
};

/**
 * Runtime options for failover speech recognition.
 */
export type SpeechToTextFailoverRecognitionOptions = {
    /**
     * Ordered provider factory list (primary to fallback).
     */
    readonly providerFactories: ReadonlyArray<SpeechToTextProviderFactory>;

    /**
     * Telemetry hook for logging and diagnostics.
     */
    readonly onTelemetry?: (event: SpeechToTextTelemetryEvent) => void;

    /**
     * Optional endpoint for telemetry forwarding.
     */
    readonly telemetryEndpoint?: string;

    /**
     * Stall timeout override.
     */
    readonly stallTimeoutMs?: number;

    /**
     * Stall-check polling interval override.
     */
    readonly stallCheckIntervalMs?: number;
};

/**
 * Fine-grained controls for one provider start attempt.
 */
type StartFromProviderIndexOptions = {
    /**
     * Whether to reset the per-provider restart guard.
     */
    readonly resetRestartGuard: boolean;
};

/**
 * Speech-recognition adapter with provider failover and telemetry.
 */
export class SpeechToTextFailoverRecognition implements SpeechRecognition {
    private callbacks: Array<(event: SpeechRecognitionEvent) => void> = [];
    private _state: SpeechRecognitionState = 'IDLE';

    private activeProvider: SpeechToTextProvider | null = null;
    private activeProviderDiagnostics: SpeechToTextProviderDiagnostics | undefined;
    private activeProviderIndex = -1;

    private startOptions: SpeechRecognitionStartOptions | undefined;
    private pendingStopDuringStart = false;
    private hasRestartedCurrentProvider = false;

    private sessionStartedAtMs = 0;
    private firstPartialAtMs: number | null = null;
    private lastPartialAtMs = 0;
    private lastAudioActivityAtMs = 0;

    private providerSessionToken = 0;
    private stopFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    private stallWatchdogTimer: ReturnType<typeof setInterval> | null = null;
    private audioActivityMonitor: MicrophoneActivityMonitor | null = null;

    public constructor(private readonly options: SpeechToTextFailoverRecognitionOptions) {}

    public get state(): SpeechRecognitionState {
        return this._state;
    }

    public async $start(startOptions: SpeechRecognitionStartOptions = {}): Promise<void> {
        if (this._state === 'RECORDING' || this._state === 'STARTING' || this._state === 'TRANSCRIBING') {
            return;
        }

        this.startOptions = startOptions;
        this.pendingStopDuringStart = false;
        this.hasRestartedCurrentProvider = false;
        this.sessionStartedAtMs = Date.now();
        this.firstPartialAtMs = null;
        this.lastPartialAtMs = Date.now();
        this.lastAudioActivityAtMs = 0;

        this.transitionState('STARTING');
        const hasProviderStarted = await this.startFromProviderIndex(0, 'initial-start');

        if (!hasProviderStarted) {
            this.transitionState('ERROR');
            this.emit({
                type: 'ERROR',
                message: 'No speech-to-text provider is available in this browser.',
                code: 'unsupported-browser',
                providerId: undefined,
                canRetry: false,
                canOpenBrowserSettings: false,
            });
        }
    }

    public $stop(): void {
        if (this._state === 'IDLE') {
            return;
        }

        if (this._state === 'STARTING') {
            this.pendingStopDuringStart = true;
            return;
        }

        if (this._state === 'RECORDING') {
            this.transitionState('TRANSCRIBING');
            this.emit({ type: 'TRANSCRIBING' });
        }

        if (!this.activeProvider) {
            this.forceIdleStop();
            return;
        }

        this.clearStopFallbackTimer();
        this.stopFallbackTimer = setTimeout(() => {
            this.forceIdleStop();
        }, STOP_GRACE_TIMEOUT_MS);

        try {
            this.activeProvider.stop();
        } catch {
            this.forceIdleStop();
        }
    }

    public subscribe(callback: (event: SpeechRecognitionEvent) => void): () => void {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter((cb) => cb !== callback);
        };
    }

    /**
     * Starts provider session from one preferred index and falls through to next providers.
     */
    private async startFromProviderIndex(
        startIndex: number,
        reason: string,
        startOptions: StartFromProviderIndexOptions = { resetRestartGuard: true },
    ): Promise<boolean> {
        const providerFactories = this.options.providerFactories;

        for (let providerIndex = startIndex; providerIndex < providerFactories.length; providerIndex++) {
            const provider = providerFactories[providerIndex]!();

            if (!provider.isSupported()) {
                this.emitTelemetry({
                    type: 'provider-unsupported',
                    providerId: provider.id,
                    detail: reason,
                });
                continue;
            }

            const providerSessionToken = ++this.providerSessionToken;
            this.activeProvider = provider;
            this.activeProviderIndex = providerIndex;
            this.activeProviderDiagnostics = provider.getDiagnostics?.();
            if (startOptions.resetRestartGuard) {
                this.hasRestartedCurrentProvider = false;
            }

            this.emitTelemetry({
                type: 'provider-selected',
                providerId: provider.id,
                detail: reason,
            });

            try {
                const providerInitStartedAtMs = Date.now();
                await provider.start({
                    language: this.startOptions?.language,
                    whisperMode: this.startOptions?.whisperMode,
                    onStart: () => {
                        if (!this.isProviderSessionCurrent(providerSessionToken)) {
                            return;
                        }

                        this.lastPartialAtMs = Date.now();
                        this.transitionState('RECORDING');
                        this.emit({ type: 'START' });
                        this.startAudioActivityMonitor();
                        this.startStallWatchdog();

                        if (this.pendingStopDuringStart) {
                            this.$stop();
                        }
                    },
                    onProcessing: () => {
                        if (!this.isProviderSessionCurrent(providerSessionToken)) {
                            return;
                        }

                        this.transitionState('TRANSCRIBING');
                        this.emit({ type: 'TRANSCRIBING' });
                    },
                    onPartial: (text) => {
                        if (!this.isProviderSessionCurrent(providerSessionToken)) {
                            return;
                        }

                        this.lastPartialAtMs = Date.now();

                        if (!this.firstPartialAtMs) {
                            this.firstPartialAtMs = Date.now();
                            this.emitTelemetry({
                                type: 'first-partial',
                                providerId: provider.id,
                                elapsedMs: this.firstPartialAtMs - this.sessionStartedAtMs,
                            });
                        }

                        this.emit({
                            type: 'RESULT',
                            text,
                            isFinal: false,
                        });
                    },
                    onFinal: (text) => {
                        if (!this.isProviderSessionCurrent(providerSessionToken)) {
                            return;
                        }

                        this.lastPartialAtMs = Date.now();
                        this.emitTelemetry({
                            type: 'final',
                            providerId: provider.id,
                            elapsedMs: Date.now() - this.sessionStartedAtMs,
                        });
                        this.emit({
                            type: 'RESULT',
                            text,
                            isFinal: true,
                        });
                    },
                    onError: (error) => {
                        if (!this.isProviderSessionCurrent(providerSessionToken)) {
                            return;
                        }

                        void this.handleProviderError(error.code, error.message, error.isRetryable);
                    },
                    onStop: () => {
                        if (!this.isProviderSessionCurrent(providerSessionToken)) {
                            return;
                        }

                        this.forceIdleStop();
                    },
                });

                this.emitTelemetry({
                    type: 'provider-init',
                    providerId: provider.id,
                    elapsedMs: Date.now() - providerInitStartedAtMs,
                });

                return true;
            } catch (error) {
                this.emitTelemetry({
                    type: 'error',
                    providerId: provider.id,
                    elapsedMs: Date.now() - this.sessionStartedAtMs,
                    code: 'provider-init-failed',
                    detail: error instanceof Error ? error.message : String(error),
                });

                this.teardownActiveProvider();
            }
        }

        this.forceIdleStop();
        return false;
    }

    /**
     * Handles provider runtime errors with restart/failover strategy.
     */
    private async handleProviderError(
        code: SpeechRecognitionErrorCode,
        message: string,
        isRetryable: boolean,
    ): Promise<void> {
        const providerId = this.activeProvider?.id;

        this.emitTelemetry({
            type: 'error',
            providerId,
            elapsedMs: Date.now() - this.sessionStartedAtMs,
            code,
            detail: message,
        });

        if (code === 'permission-denied') {
            this.transitionState('ERROR');
            this.emit({
                type: 'ERROR',
                message,
                code,
                providerId,
                canRetry: true,
                canOpenBrowserSettings: true,
            });
            this.forceIdleStop();
            return;
        }

        if (this._state === 'STARTING') {
            const failoverSucceeded = await this.failoverToNextProvider('init-error');
            if (failoverSucceeded) {
                return;
            }
        } else if (isRetryable && !this.hasRestartedCurrentProvider) {
            this.hasRestartedCurrentProvider = true;
            this.emitTelemetry({
                type: 'provider-restart',
                providerId,
                elapsedMs: Date.now() - this.sessionStartedAtMs,
            });

            const restartSucceeded = await this.restartCurrentProvider('runtime-error');
            if (restartSucceeded) {
                return;
            }

            const failoverSucceeded = await this.failoverToNextProvider('restart-failed');
            if (failoverSucceeded) {
                return;
            }
        } else {
            const failoverSucceeded = await this.failoverToNextProvider('runtime-error');
            if (failoverSucceeded) {
                return;
            }
        }

        this.transitionState('ERROR');
        this.emit({
            type: 'ERROR',
            message,
            code,
            providerId,
            canRetry: isRetryable,
            canOpenBrowserSettings: false,
        });
        this.forceIdleStop();
    }

    /**
     * Restarts the currently selected provider one time.
     */
    private async restartCurrentProvider(reason: string): Promise<boolean> {
        if (this.activeProviderIndex < 0) {
            return false;
        }

        this.teardownActiveProvider();
        this.transitionState('STARTING');
        return this.startFromProviderIndex(this.activeProviderIndex, reason, {
            resetRestartGuard: false,
        });
    }

    /**
     * Switches to the next provider in priority order.
     */
    private async failoverToNextProvider(reason: string): Promise<boolean> {
        if (this.activeProviderIndex < 0) {
            return false;
        }

        const previousProviderId = this.activeProvider?.id;
        const nextProviderIndex = this.activeProviderIndex + 1;
        this.teardownActiveProvider();
        this.transitionState('STARTING');

        this.emitTelemetry({
            type: 'provider-failover',
            providerId: previousProviderId,
            elapsedMs: Date.now() - this.sessionStartedAtMs,
            detail: reason,
        });

        return this.startFromProviderIndex(nextProviderIndex, reason);
    }

    /**
     * Starts audio activity monitor used by stall detection.
     */
    private startAudioActivityMonitor(): void {
        if (this.audioActivityMonitor) {
            return;
        }

        this.audioActivityMonitor = new MicrophoneActivityMonitor();
        this.audioActivityMonitor.start((level) => {
            if (level >= ACTIVE_AUDIO_LEVEL_THRESHOLD) {
                this.lastAudioActivityAtMs = Date.now();
            }
        });
    }

    /**
     * Starts provider stall watchdog.
     */
    private startStallWatchdog(): void {
        this.stopStallWatchdog();

        const supportsPartials = this.activeProviderDiagnostics?.supportsPartials ?? true;
        if (!supportsPartials) {
            return;
        }

        const stallTimeoutMs = this.options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT_MS;
        const stallCheckIntervalMs = this.options.stallCheckIntervalMs ?? DEFAULT_STALL_CHECK_INTERVAL_MS;

        this.stallWatchdogTimer = setInterval(() => {
            if (this._state !== 'RECORDING') {
                return;
            }

            const now = Date.now();
            const noPartialDurationMs = now - this.lastPartialAtMs;
            const hasRecentAudioActivity = now - this.lastAudioActivityAtMs <= AUDIO_ACTIVITY_RECENCY_MS;

            if (!hasRecentAudioActivity || noPartialDurationMs < stallTimeoutMs) {
                return;
            }

            if (!this.hasRestartedCurrentProvider) {
                this.hasRestartedCurrentProvider = true;
                void this.restartCurrentProvider('stall-detected');
                return;
            }

            void this.failoverToNextProvider('stall-after-restart');
        }, stallCheckIntervalMs);
    }

    /**
     * Stops provider stall watchdog.
     */
    private stopStallWatchdog(): void {
        if (!this.stallWatchdogTimer) {
            return;
        }

        clearInterval(this.stallWatchdogTimer);
        this.stallWatchdogTimer = null;
    }

    /**
     * Clears stop fallback timer.
     */
    private clearStopFallbackTimer(): void {
        if (!this.stopFallbackTimer) {
            return;
        }

        clearTimeout(this.stopFallbackTimer);
        this.stopFallbackTimer = null;
    }

    /**
     * Tears down active provider and related watchdogs.
     */
    private teardownActiveProvider(): void {
        this.clearStopFallbackTimer();
        this.stopStallWatchdog();
        this.audioActivityMonitor?.stop();
        this.audioActivityMonitor = null;

        try {
            this.activeProvider?.abort();
        } catch {
            // Ignore teardown failures to keep failover resilient.
        }

        this.activeProvider = null;
        this.activeProviderDiagnostics = undefined;
        this.activeProviderIndex = -1;
    }

    /**
     * Moves state to idle and emits STOP exactly once.
     */
    private forceIdleStop(): void {
        this.teardownActiveProvider();
        this.transitionState('IDLE');
        this.emit({ type: 'STOP' });
    }

    /**
     * Updates internal recognition state.
     */
    private transitionState(nextState: SpeechRecognitionState): void {
        this._state = nextState;
    }

    /**
     * Verifies callback belongs to the current provider session token.
     */
    private isProviderSessionCurrent(providerSessionToken: number): boolean {
        return providerSessionToken === this.providerSessionToken;
    }

    /**
     * Emits one event to all subscribers.
     */
    private emit(event: SpeechRecognitionEvent): void {
        for (const callback of this.callbacks) {
            callback(event);
        }
    }

    /**
     * Emits telemetry to console and optional endpoint.
     */
    private emitTelemetry(event: SpeechToTextTelemetryEvent): void {
        this.options.onTelemetry?.(event);
        console.info('[speech-to-text]', event);

        if (!this.options.telemetryEndpoint || typeof window === 'undefined') {
            return;
        }

        void fetch(this.options.telemetryEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(event),
            keepalive: true,
        }).catch(() => {
            // Best-effort telemetry transport.
        });
    }
}

/**
 * Lightweight microphone activity monitor used by stall detection.
 */
class MicrophoneActivityMonitor {
    private stream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;
    private analyser: AnalyserNode | null = null;
    private frameId: number | null = null;

    /**
     * Starts activity monitoring and reports normalized audio levels.
     */
    public start(onAudioLevel: (level: number) => void): void {
        void this.startAsync(onAudioLevel);
    }

    /**
     * Stops monitoring and releases browser resources.
     */
    public stop(): void {
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }

        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        if (this.audioContext) {
            void this.audioContext.close().catch(() => undefined);
            this.audioContext = null;
        }

        if (this.stream) {
            for (const track of this.stream.getTracks()) {
                track.stop();
            }
            this.stream = null;
        }

        this.analyser = null;
    }

    /**
     * Async setup for analyzer graph.
     */
    private async startAsync(onAudioLevel: (level: number) => void): Promise<void> {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            return;
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new AudioContext();
            this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = AUDIO_MONITOR_FFT_SIZE;
            this.sourceNode.connect(this.analyser);

            const sampleBuffer = new Uint8Array(this.analyser.fftSize);

            const poll = () => {
                if (!this.analyser) {
                    return;
                }

                this.analyser.getByteTimeDomainData(sampleBuffer);

                let sumOfSquares = 0;
                for (const value of sampleBuffer) {
                    const normalizedSample = (value - PCM_U8_MIDPOINT) / PCM_U8_MIDPOINT;
                    sumOfSquares += normalizedSample * normalizedSample;
                }

                const rms = Math.sqrt(sumOfSquares / sampleBuffer.length);
                onAudioLevel(rms);

                this.frameId = requestAnimationFrame(poll);
            };

            this.frameId = requestAnimationFrame(poll);
        } catch {
            this.stop();
        }
    }
}
