import type {
    SpeechRecognition,
    SpeechRecognitionEvent,
    SpeechRecognitionStartOptions,
    SpeechRecognitionState,
} from '../../../../../src/types/SpeechRecognition';
import type {
    SpeechToTextProviderDiagnostics,
    SpeechToTextProviderError,
    SpeechToTextProviderFactory,
} from './SpeechToTextProvider';
import { SpeechToTextFailoverRecognitionProviderRuntime } from './SpeechToTextFailoverRecognition/SpeechToTextFailoverRecognitionProviderRuntime';
import { SpeechToTextFailoverRecognitionStallWatchdog } from './SpeechToTextFailoverRecognition/SpeechToTextFailoverRecognitionStallWatchdog';
import { SpeechToTextTelemetryReporter } from './SpeechToTextFailoverRecognition/SpeechToTextTelemetryReporter';
import type { SpeechToTextTelemetryEvent } from './SpeechToTextFailoverRecognition/SpeechToTextTelemetryEvent';

export type { SpeechToTextTelemetryEvent } from './SpeechToTextFailoverRecognition/SpeechToTextTelemetryEvent';

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
 * Speech-recognition adapter with provider failover and telemetry.
 */
export class SpeechToTextFailoverRecognition implements SpeechRecognition {
    private callbacks: Array<(event: SpeechRecognitionEvent) => void> = [];
    private _state: SpeechRecognitionState = 'IDLE';

    private startOptions: SpeechRecognitionStartOptions | undefined;
    private pendingStopDuringStart = false;

    private sessionStartedAtMs = 0;
    private firstPartialAtMs: number | null = null;

    private readonly telemetryReporter: SpeechToTextTelemetryReporter;
    private readonly stallWatchdog: SpeechToTextFailoverRecognitionStallWatchdog;
    private readonly providerRuntime: SpeechToTextFailoverRecognitionProviderRuntime;

    public constructor(private readonly options: SpeechToTextFailoverRecognitionOptions) {
        this.telemetryReporter = new SpeechToTextTelemetryReporter({
            onTelemetry: options.onTelemetry,
            telemetryEndpoint: options.telemetryEndpoint,
        });

        this.stallWatchdog = new SpeechToTextFailoverRecognitionStallWatchdog({
            stallTimeoutMs: options.stallTimeoutMs,
            stallCheckIntervalMs: options.stallCheckIntervalMs,
            isRecognitionRecording: () => this._state === 'RECORDING',
            onStallDetected: this.handleStallDetected.bind(this),
        });

        this.providerRuntime = new SpeechToTextFailoverRecognitionProviderRuntime({
            providerFactories: options.providerFactories,
            getStartOptions: () => this.startOptions,
            getSessionStartedAtMs: () => this.sessionStartedAtMs,
            emitTelemetry: this.telemetryReporter.emit.bind(this.telemetryReporter),
            onBeforeProviderTeardown: this.stallWatchdog.stop.bind(this.stallWatchdog),
            onForceIdleStop: this.forceIdleStop.bind(this),
            onProviderStart: this.handleProviderStart.bind(this),
            onProviderProcessing: this.handleProviderProcessing.bind(this),
            onProviderPartial: this.handleProviderPartial.bind(this),
            onProviderFinal: this.handleProviderFinal.bind(this),
            onProviderError: this.handleProviderError.bind(this),
            onProviderStop: this.forceIdleStop.bind(this),
        });
    }

    public get state(): SpeechRecognitionState {
        return this._state;
    }

    /**
     * Exposes the currently active provider identifier when one is selected.
     */
    public get currentProviderId(): string | undefined {
        return this.providerRuntime.currentProviderId;
    }

    /**
     * Exposes live diagnostics for the currently active provider.
     */
    public get currentProviderDiagnostics(): SpeechToTextProviderDiagnostics | undefined {
        return this.providerRuntime.currentProviderDiagnostics;
    }

    public async $start(startOptions: SpeechRecognitionStartOptions = {}): Promise<void> {
        if (this._state === 'RECORDING' || this._state === 'STARTING' || this._state === 'TRANSCRIBING') {
            return;
        }

        this.startOptions = startOptions;
        this.pendingStopDuringStart = false;
        this.sessionStartedAtMs = Date.now();
        this.firstPartialAtMs = null;
        this.stallWatchdog.reset();

        this._state = 'STARTING';
        const hasProviderStarted = await this.providerRuntime.startFromProviderIndex(0, 'initial-start');

        if (!hasProviderStarted) {
            this._state = 'ERROR';
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
            this._state = 'TRANSCRIBING';
            this.emit({ type: 'TRANSCRIBING' });
        }

        this.providerRuntime.requestStop();
    }

    public subscribe(callback: (event: SpeechRecognitionEvent) => void): () => void {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter((registeredCallback) => registeredCallback !== callback);
        };
    }

    /**
     * Handles provider lifecycle start signal.
     */
    private handleProviderStart(): void {
        this.stallWatchdog.markTranscriptActivity();
        this._state = 'RECORDING';
        this.emit({ type: 'START' });
        this.stallWatchdog.start(this.providerRuntime.currentProviderSupportsPartials);

        if (this.pendingStopDuringStart) {
            this.$stop();
        }
    }

    /**
     * Handles provider lifecycle transition into processing/transcribing.
     */
    private handleProviderProcessing(): void {
        this._state = 'TRANSCRIBING';
        this.emit({ type: 'TRANSCRIBING' });
    }

    /**
     * Handles provider partial transcript updates.
     */
    private handleProviderPartial(text: string): void {
        this.stallWatchdog.markTranscriptActivity();

        if (!this.firstPartialAtMs) {
            const firstPartialAtMs = Date.now();
            this.firstPartialAtMs = firstPartialAtMs;
            this.telemetryReporter.emit({
                type: 'first-partial',
                providerId: this.providerRuntime.currentProviderId,
                elapsedMs: firstPartialAtMs - this.sessionStartedAtMs,
            });
        }

        this.emit({
            type: 'RESULT',
            text,
            isFinal: false,
        });
    }

    /**
     * Handles provider final transcript updates.
     */
    private handleProviderFinal(text: string): void {
        this.stallWatchdog.markTranscriptActivity();
        this.telemetryReporter.emit({
            type: 'final',
            providerId: this.providerRuntime.currentProviderId,
            elapsedMs: Date.now() - this.sessionStartedAtMs,
        });

        this.emit({
            type: 'RESULT',
            text,
            isFinal: true,
        });
    }

    /**
     * Handles provider runtime errors with restart/failover strategy.
     */
    private async handleProviderError({
        code,
        message,
        isRetryable,
    }: SpeechToTextProviderError): Promise<void> {
        const providerId = this.providerRuntime.currentProviderId;

        this.telemetryReporter.emit({
            type: 'error',
            providerId,
            elapsedMs: Date.now() - this.sessionStartedAtMs,
            code,
            detail: message,
        });

        if (code === 'permission-denied') {
            this._state = 'ERROR';
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
            const failoverSucceeded = await this.providerRuntime.failoverToNextProvider('init-error');
            if (failoverSucceeded) {
                return;
            }
        } else if (isRetryable && !this.providerRuntime.hasRestartedCurrentProvider) {
            this.providerRuntime.markCurrentProviderRestarted();
            this.telemetryReporter.emit({
                type: 'provider-restart',
                providerId,
                elapsedMs: Date.now() - this.sessionStartedAtMs,
            });

            const restartSucceeded = await this.providerRuntime.restartCurrentProvider('runtime-error');
            if (restartSucceeded) {
                return;
            }

            const failoverSucceeded = await this.providerRuntime.failoverToNextProvider('restart-failed');
            if (failoverSucceeded) {
                return;
            }
        } else {
            const failoverSucceeded = await this.providerRuntime.failoverToNextProvider('runtime-error');
            if (failoverSucceeded) {
                return;
            }
        }

        this._state = 'ERROR';
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
     * Handles stall watchdog restart/failover escalation.
     */
    private handleStallDetected(): void {
        if (!this.providerRuntime.hasRestartedCurrentProvider) {
            this.providerRuntime.markCurrentProviderRestarted();
            void this.providerRuntime.restartCurrentProvider('stall-detected');
            return;
        }

        void this.providerRuntime.failoverToNextProvider('stall-after-restart');
    }

    /**
     * Moves state to idle and emits STOP.
     */
    private forceIdleStop(): void {
        this.providerRuntime.teardownActiveProvider();
        this._state = 'IDLE';
        this.emit({ type: 'STOP' });
    }

    /**
     * Emits one event to all subscribers.
     */
    private emit(event: SpeechRecognitionEvent): void {
        for (const callback of this.callbacks) {
            callback(event);
        }
    }
}
