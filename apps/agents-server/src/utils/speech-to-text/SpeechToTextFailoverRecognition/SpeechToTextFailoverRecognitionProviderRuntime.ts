import type { SpeechRecognitionStartOptions } from '../../../../../../src/types/SpeechRecognition';
import type {
    SpeechToTextProvider,
    SpeechToTextProviderDiagnostics,
    SpeechToTextProviderError,
    SpeechToTextProviderFactory,
} from '../SpeechToTextProvider';
import { createSpeechToTextFailoverRecognitionProviderStartOptions } from './createSpeechToTextFailoverRecognitionProviderStartOptions';
import type { SpeechToTextTelemetryEvent } from './SpeechToTextTelemetryEvent';

/**
 * Grace period after requesting stop before forcing idle fallback.
 */
const STOP_GRACE_TIMEOUT_MS = 2500;

type SpeechToTextFailoverRecognitionProviderRuntimeOptions = {
    readonly providerFactories: ReadonlyArray<SpeechToTextProviderFactory>;
    readonly getStartOptions: () => SpeechRecognitionStartOptions | undefined;
    readonly getSessionStartedAtMs: () => number;
    readonly emitTelemetry: (event: SpeechToTextTelemetryEvent) => void;
    readonly onBeforeProviderTeardown: () => void;
    readonly onForceIdleStop: () => void;
    readonly onProviderStart: () => void;
    readonly onProviderProcessing: () => void;
    readonly onProviderPartial: (text: string) => void;
    readonly onProviderFinal: (text: string) => void;
    readonly onProviderError: (error: SpeechToTextProviderError) => Promise<void> | void;
    readonly onProviderStop: () => void;
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
 * Provider lifecycle runtime used by `SpeechToTextFailoverRecognition`.
 *
 * @private function of SpeechToTextFailoverRecognition
 */
export class SpeechToTextFailoverRecognitionProviderRuntime {
    private activeProvider: SpeechToTextProvider | null = null;
    private activeProviderDiagnostics: SpeechToTextProviderDiagnostics | undefined;
    private activeProviderIndex = -1;

    private hasRestartedCurrentProviderValue = false;
    private providerSessionToken = 0;
    private stopFallbackTimer: ReturnType<typeof setTimeout> | null = null;

    public constructor(private readonly options: SpeechToTextFailoverRecognitionProviderRuntimeOptions) {}

    /**
     * Exposes the currently active provider identifier when one is selected.
     */
    public get currentProviderId(): string | undefined {
        return this.activeProvider?.id;
    }

    /**
     * Exposes live diagnostics for the currently active provider.
     */
    public get currentProviderDiagnostics(): SpeechToTextProviderDiagnostics | undefined {
        return this.activeProviderDiagnostics;
    }

    /**
     * Exposes whether the active provider supports partial transcript callbacks.
     */
    public get currentProviderSupportsPartials(): boolean {
        return this.activeProviderDiagnostics?.supportsPartials ?? true;
    }

    /**
     * Exposes whether the current provider has already consumed its one restart attempt.
     */
    public get hasRestartedCurrentProvider(): boolean {
        return this.hasRestartedCurrentProviderValue;
    }

    /**
     * Clears the one-time restart guard for the active provider.
     */
    public resetRestartGuard(): void {
        this.hasRestartedCurrentProviderValue = false;
    }

    /**
     * Marks the active provider as already restarted once.
     */
    public markCurrentProviderRestarted(): void {
        this.hasRestartedCurrentProviderValue = true;
    }

    /**
     * Starts provider session from one preferred index and falls through to next providers.
     */
    public async startFromProviderIndex(
        startIndex: number,
        reason: string,
        startOptions: StartFromProviderIndexOptions = { resetRestartGuard: true },
    ): Promise<boolean> {
        const providerFactories = this.options.providerFactories;

        for (let providerIndex = startIndex; providerIndex < providerFactories.length; providerIndex++) {
            const provider = providerFactories[providerIndex]!();

            if (!provider.isSupported()) {
                this.options.emitTelemetry({
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
                this.resetRestartGuard();
            }

            this.options.emitTelemetry({
                type: 'provider-selected',
                providerId: provider.id,
                detail: reason,
            });

            try {
                const providerInitStartedAtMs = Date.now();
                const currentStartOptions = this.options.getStartOptions();

                await provider.start(
                    createSpeechToTextFailoverRecognitionProviderStartOptions({
                        language: currentStartOptions?.language,
                        whisperMode: currentStartOptions?.whisperMode,
                        transcriptionPrompt: currentStartOptions?.transcriptionPrompt,
                        isCurrentProviderSession: () => providerSessionToken === this.providerSessionToken,
                        onStart: this.options.onProviderStart,
                        onProcessing: this.options.onProviderProcessing,
                        onPartial: this.options.onProviderPartial,
                        onFinal: this.options.onProviderFinal,
                        onError: this.options.onProviderError,
                        onStop: this.options.onProviderStop,
                    }),
                );

                this.options.emitTelemetry({
                    type: 'provider-init',
                    providerId: provider.id,
                    elapsedMs: Date.now() - providerInitStartedAtMs,
                });

                return true;
            } catch (error) {
                this.options.emitTelemetry({
                    type: 'error',
                    providerId: provider.id,
                    elapsedMs: this.getSessionElapsedMs(),
                    code: 'provider-init-failed',
                    detail: error instanceof Error ? error.message : String(error),
                });

                this.teardownActiveProvider();
            }
        }

        this.options.onForceIdleStop();
        return false;
    }

    /**
     * Requests a graceful provider stop and falls back to forced idle when necessary.
     */
    public requestStop(): void {
        if (!this.activeProvider) {
            this.options.onForceIdleStop();
            return;
        }

        this.clearStopFallbackTimer();
        this.stopFallbackTimer = setTimeout(this.options.onForceIdleStop, STOP_GRACE_TIMEOUT_MS);

        try {
            this.activeProvider.stop();
        } catch {
            this.options.onForceIdleStop();
        }
    }

    /**
     * Restarts the currently selected provider one time.
     */
    public async restartCurrentProvider(reason: string): Promise<boolean> {
        if (this.activeProviderIndex < 0) {
            return false;
        }

        const currentProviderIndex = this.activeProviderIndex;
        this.teardownActiveProvider();

        return this.startFromProviderIndex(currentProviderIndex, reason, {
            resetRestartGuard: false,
        });
    }

    /**
     * Switches to the next provider in priority order.
     */
    public async failoverToNextProvider(reason: string): Promise<boolean> {
        if (this.activeProviderIndex < 0) {
            return false;
        }

        const previousProviderId = this.activeProvider?.id;
        const nextProviderIndex = this.activeProviderIndex + 1;
        this.teardownActiveProvider();

        this.options.emitTelemetry({
            type: 'provider-failover',
            providerId: previousProviderId,
            elapsedMs: this.getSessionElapsedMs(),
            detail: reason,
        });

        return this.startFromProviderIndex(nextProviderIndex, reason);
    }

    /**
     * Tears down active provider and related timers.
     */
    public teardownActiveProvider(): void {
        this.clearStopFallbackTimer();
        this.options.onBeforeProviderTeardown();

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
     * Clears the stop fallback timer.
     */
    private clearStopFallbackTimer(): void {
        if (!this.stopFallbackTimer) {
            return;
        }

        clearTimeout(this.stopFallbackTimer);
        this.stopFallbackTimer = null;
    }

    /**
     * Reads milliseconds elapsed since the current outer session started.
     */
    private getSessionElapsedMs(): number {
        return Date.now() - this.options.getSessionStartedAtMs();
    }
}
