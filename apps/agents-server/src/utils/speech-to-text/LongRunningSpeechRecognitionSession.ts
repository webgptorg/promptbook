import type {
    SpeechRecognition,
    SpeechRecognitionEvent,
    SpeechRecognitionStartOptions,
    SpeechRecognitionState,
} from '../../../../../src/types/SpeechRecognition';
import { SpeechToTextFailoverRecognition, type SpeechToTextTelemetryEvent } from './SpeechToTextFailoverRecognition';
import type { SpeechToTextProviderDiagnostics, SpeechToTextProviderId } from './SpeechToTextProvider';

/**
 * Delay before one unexpected stop re-creates the wrapped recognition session.
 */
const DEFAULT_RESTART_DELAY_MS = 350;

/**
 * Configuration consumed by `LongRunningSpeechRecognitionSession`.
 */
export type LongRunningSpeechRecognitionSessionOptions = {
    /**
     * Creates one short-lived underlying recognition instance.
     */
    readonly createRecognition: (options: {
        readonly onTelemetry?: (event: SpeechToTextTelemetryEvent) => void;
    }) => SpeechRecognition | undefined;

    /**
     * Called for wrapper-level lifecycle and telemetry events.
     */
    readonly onSessionEvent?: (event: LongRunningSpeechRecognitionSessionEvent) => void;

    /**
     * Delay before the next internal recognition restart attempt.
     */
    readonly restartDelayMs?: number;
};

/**
 * Wrapper-specific lifecycle events used by the testing UI.
 */
export type LongRunningSpeechRecognitionSessionEvent =
    | {
          readonly type: 'restart';
          readonly restartCount: number;
      }
    | {
          readonly type: 'telemetry';
          readonly telemetry: SpeechToTextTelemetryEvent;
          readonly providerId?: SpeechToTextProviderId;
          readonly diagnostics?: SpeechToTextProviderDiagnostics;
      };

/**
 * Long-running speech-recognition wrapper that keeps one external recording session alive while
 * recreating the internal provider session after unexpected browser/provider stops.
 */
export class LongRunningSpeechRecognitionSession implements SpeechRecognition {
    private callbacks: Array<(event: SpeechRecognitionEvent) => void> = [];
    private _state: SpeechRecognitionState = 'IDLE';

    private activeRecognition: SpeechRecognition | null = null;
    private activeRecognitionUnsubscribe: (() => void) | null = null;
    private activeCycleToken = 0;

    private startOptions: SpeechRecognitionStartOptions = {};
    private restartTimer: ReturnType<typeof setTimeout> | null = null;
    private isRunningExternally = false;
    private hasTerminalFailure = false;

    private _currentProviderId: SpeechToTextProviderId | undefined;
    private _currentProviderDiagnostics: SpeechToTextProviderDiagnostics | undefined;
    private _restartCount = 0;
    private _finalChunks: Array<string> = [];
    private _partialText = '';

    public constructor(private readonly options: LongRunningSpeechRecognitionSessionOptions) {}

    public get state(): SpeechRecognitionState {
        return this._state;
    }

    /**
     * Stable list of finalized transcript chunks accumulated across restarts.
     */
    public get finalChunks(): ReadonlyArray<string> {
        return this._finalChunks;
    }

    /**
     * Latest in-progress partial text after overlap reconciliation.
     */
    public get partialText(): string {
        return this._partialText;
    }

    /**
     * Count of unexpected internal restarts in the current outer session.
     */
    public get restartCount(): number {
        return this._restartCount;
    }

    /**
     * Currently selected provider identifier when known.
     */
    public get currentProviderId(): SpeechToTextProviderId | undefined {
        return this._currentProviderId;
    }

    /**
     * Diagnostics snapshot for the current provider when available.
     */
    public get currentProviderDiagnostics(): SpeechToTextProviderDiagnostics | undefined {
        return this._currentProviderDiagnostics;
    }

    public $start(startOptions: SpeechRecognitionStartOptions = {}): void {
        if (this.isRunningExternally) {
            return;
        }

        this.startOptions = startOptions;
        this.isRunningExternally = true;
        this.hasTerminalFailure = false;
        this._restartCount = 0;
        this._finalChunks = [];
        this.updatePartialText('');
        this._currentProviderId = undefined;
        this._currentProviderDiagnostics = undefined;

        this.transitionState('STARTING');
        this.startRecognitionCycle();
    }

    public $stop(): void {
        if (!this.isRunningExternally && this._state === 'IDLE') {
            return;
        }

        this.isRunningExternally = false;
        this.hasTerminalFailure = false;
        this.clearRestartTimer();
        this.detachActiveRecognition({ shouldStopRecognition: true });
        this.transitionState('IDLE');
        this.emit({ type: 'STOP' });
    }

    public subscribe(callback: (event: SpeechRecognitionEvent) => void): () => void {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter((registeredCallback) => registeredCallback !== callback);
        };
    }

    /**
     * Creates and starts the next inner recognition cycle.
     */
    private startRecognitionCycle(): void {
        if (!this.isRunningExternally) {
            return;
        }

        this.clearRestartTimer();
        this.hasTerminalFailure = false;

        const cycleToken = ++this.activeCycleToken;
        const recognition = this.options.createRecognition({
            onTelemetry: (telemetry) => {
                if (!this.isCycleCurrent(cycleToken)) {
                    return;
                }

                if (recognition) {
                    this.captureRecognitionDiagnostics(recognition, telemetry.providerId);
                }
                this.options.onSessionEvent?.({
                    type: 'telemetry',
                    telemetry,
                    providerId: this._currentProviderId,
                    diagnostics: this._currentProviderDiagnostics,
                });
            },
        });

        if (!recognition) {
            this.transitionState('ERROR');
            this.emit({
                type: 'ERROR',
                message: 'Speech recognition is not available in this browser.',
                code: 'unsupported-browser',
                canRetry: false,
                canOpenBrowserSettings: false,
            });
            this.isRunningExternally = false;
            this.transitionState('IDLE');
            this.emit({ type: 'STOP' });
            return;
        }

        this.activeRecognition = recognition;
        this.captureRecognitionDiagnostics(recognition);
        this.activeRecognitionUnsubscribe = recognition.subscribe((event) => {
            if (!this.isCycleCurrent(cycleToken)) {
                return;
            }

            this.handleRecognitionEvent(event);
        });

        recognition.$start(this.startOptions);
    }

    /**
     * Handles one event from the wrapped recognition implementation.
     */
    private handleRecognitionEvent(event: SpeechRecognitionEvent): void {
        if (event.type === 'START') {
            this.transitionState('RECORDING');
            this.emit(event);
            return;
        }

        if (event.type === 'TRANSCRIBING') {
            this.transitionState('TRANSCRIBING');
            this.emit(event);
            return;
        }

        if (event.type === 'RESULT') {
            if (event.isFinal) {
                this.handleFinalResult(event.text);
            } else {
                this.handlePartialResult(event.text);
            }
            return;
        }

        if (event.type === 'ERROR') {
            this.hasTerminalFailure = true;
            this.transitionState('ERROR');
            this.emit(event);
            return;
        }

        if (event.type === 'STOP') {
            this.detachActiveRecognition({ shouldStopRecognition: false });

            if (!this.isRunningExternally || this.hasTerminalFailure) {
                this.isRunningExternally = false;
                this.transitionState('IDLE');
                this.emit({ type: 'STOP' });
                return;
            }

            this.updatePartialText('');
            this.transitionState('STARTING');
            this._restartCount++;
            this.options.onSessionEvent?.({
                type: 'restart',
                restartCount: this._restartCount,
            });

            this.restartTimer = setTimeout(() => {
                this.startRecognitionCycle();
            }, this.options.restartDelayMs ?? DEFAULT_RESTART_DELAY_MS);
        }
    }

    /**
     * Reconciles one partial transcript with already finalized text.
     */
    private handlePartialResult(rawText: string): void {
        const reconciledPartial = removeTranscriptOverlap(this.getStableTranscript(), rawText);
        this.transitionState('RECORDING');
        this.updatePartialText(reconciledPartial);
    }

    /**
     * Stores one finalized transcript chunk after overlap removal.
     */
    private handleFinalResult(rawText: string): void {
        const reconciledChunk = removeTranscriptOverlap(this.getStableTranscript(), rawText);

        if (reconciledChunk.length > 0) {
            this._finalChunks = [...this._finalChunks, reconciledChunk];
            this.emit({
                type: 'RESULT',
                text: reconciledChunk,
                isFinal: true,
            });
        }

        this.transitionState('RECORDING');
        this.updatePartialText('');
    }

    /**
     * Updates the current partial text and emits it only when it actually changes.
     */
    private updatePartialText(nextPartialText: string): void {
        const normalizedNextPartialText = normalizeTranscriptText(nextPartialText);
        if (normalizedNextPartialText === this._partialText) {
            return;
        }

        this._partialText = normalizedNextPartialText;
        this.emit({
            type: 'RESULT',
            text: normalizedNextPartialText,
            isFinal: false,
        });
    }

    /**
     * Reads one stable transcript string assembled from finalized chunks only.
     */
    private getStableTranscript(): string {
        return normalizeTranscriptText(this._finalChunks.join(' '));
    }

    /**
     * Stops listening to the current inner recognition and optionally asks it to stop too.
     */
    private detachActiveRecognition(options: { readonly shouldStopRecognition: boolean }): void {
        const recognitionToDetach = this.activeRecognition;
        this.activeRecognition = null;

        this.activeRecognitionUnsubscribe?.();
        this.activeRecognitionUnsubscribe = null;
        ++this.activeCycleToken;

        if (options.shouldStopRecognition && recognitionToDetach) {
            try {
                recognitionToDetach.$stop();
            } catch {
                // Stop is best-effort because this wrapper is testing-only.
            }
        }
    }

    /**
     * Captures live provider diagnostics when the wrapped recognition exposes them.
     */
    private captureRecognitionDiagnostics(
        recognition: SpeechRecognition,
        fallbackProviderId?: string,
    ): void {
        if (recognition instanceof SpeechToTextFailoverRecognition) {
            this._currentProviderId = recognition.currentProviderId as SpeechToTextProviderId | undefined;
            this._currentProviderDiagnostics = recognition.currentProviderDiagnostics;
            return;
        }

        this._currentProviderId = fallbackProviderId as SpeechToTextProviderId | undefined;
        this._currentProviderDiagnostics = undefined;
    }

    /**
     * Checks whether one callback still belongs to the active cycle.
     */
    private isCycleCurrent(cycleToken: number): boolean {
        return cycleToken === this.activeCycleToken;
    }

    /**
     * Updates the outer wrapper state.
     */
    private transitionState(nextState: SpeechRecognitionState): void {
        this._state = nextState;
    }

    /**
     * Clears any pending restart timer.
     */
    private clearRestartTimer(): void {
        if (!this.restartTimer) {
            return;
        }

        clearTimeout(this.restartTimer);
        this.restartTimer = null;
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

/**
 * Normalizes transcript text while keeping natural word spacing stable.
 */
function normalizeTranscriptText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
}

/**
 * Removes already finalized transcript overlap from one new partial/final text update.
 */
function removeTranscriptOverlap(stableTranscript: string, incomingText: string): string {
    const normalizedStableTranscript = normalizeTranscriptText(stableTranscript);
    const normalizedIncomingText = normalizeTranscriptText(incomingText);

    if (!normalizedIncomingText) {
        return '';
    }

    if (!normalizedStableTranscript) {
        return normalizedIncomingText;
    }

    const overlapLength = getLargestTranscriptOverlapLength(normalizedStableTranscript, normalizedIncomingText);
    return normalizeTranscriptText(normalizedIncomingText.slice(overlapLength));
}

/**
 * Finds the largest suffix/prefix overlap between the stable transcript and one new update.
 */
function getLargestTranscriptOverlapLength(stableTranscript: string, incomingText: string): number {
    const maximumOverlapLength = Math.min(stableTranscript.length, incomingText.length);

    for (let overlapLength = maximumOverlapLength; overlapLength > 0; overlapLength--) {
        const stableSuffix = stableTranscript.slice(-overlapLength).toLocaleLowerCase();
        const incomingPrefix = incomingText.slice(0, overlapLength).toLocaleLowerCase();

        if (stableSuffix === incomingPrefix) {
            return overlapLength;
        }
    }

    return 0;
}
