import { MicrophoneActivityMonitor } from './MicrophoneActivityMonitor';

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
 * Minimum normalized audio level treated as non-silent input.
 */
const ACTIVE_AUDIO_LEVEL_THRESHOLD = 0.02;

type SpeechToTextFailoverRecognitionStallWatchdogOptions = {
    readonly stallTimeoutMs?: number;
    readonly stallCheckIntervalMs?: number;
    readonly isRecognitionRecording: () => boolean;
    readonly onStallDetected: () => void;
};

/**
 * Stall watchdog used by `SpeechToTextFailoverRecognition`.
 *
 * @private function of SpeechToTextFailoverRecognition
 */
export class SpeechToTextFailoverRecognitionStallWatchdog {
    private lastPartialAtMs = 0;
    private lastAudioActivityAtMs = 0;
    private stallWatchdogTimer: ReturnType<typeof setInterval> | null = null;
    private audioActivityMonitor: MicrophoneActivityMonitor | null = null;

    public constructor(private readonly options: SpeechToTextFailoverRecognitionStallWatchdogOptions) {}

    /**
     * Resets per-session timestamps tracked by the watchdog.
     */
    public reset(): void {
        this.lastPartialAtMs = Date.now();
        this.lastAudioActivityAtMs = 0;
    }

    /**
     * Records transcript activity from provider lifecycle callbacks.
     */
    public markTranscriptActivity(): void {
        this.lastPartialAtMs = Date.now();
    }

    /**
     * Starts the watchdog when the active provider supports partial transcripts.
     */
    public start(supportsPartials: boolean): void {
        this.stop();

        if (!supportsPartials) {
            return;
        }

        this.audioActivityMonitor = new MicrophoneActivityMonitor();
        this.audioActivityMonitor.start((level) => {
            if (level >= ACTIVE_AUDIO_LEVEL_THRESHOLD) {
                this.lastAudioActivityAtMs = Date.now();
            }
        });

        const stallTimeoutMs = this.options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT_MS;
        const stallCheckIntervalMs = this.options.stallCheckIntervalMs ?? DEFAULT_STALL_CHECK_INTERVAL_MS;

        this.stallWatchdogTimer = setInterval(() => {
            if (!this.options.isRecognitionRecording()) {
                return;
            }

            const now = Date.now();
            const noPartialDurationMs = now - this.lastPartialAtMs;
            const hasRecentAudioActivity = now - this.lastAudioActivityAtMs <= AUDIO_ACTIVITY_RECENCY_MS;

            if (!hasRecentAudioActivity || noPartialDurationMs < stallTimeoutMs) {
                return;
            }

            this.options.onStallDetected();
        }, stallCheckIntervalMs);
    }

    /**
     * Stops all watchdog timers and microphone monitoring.
     */
    public stop(): void {
        if (this.stallWatchdogTimer) {
            clearInterval(this.stallWatchdogTimer);
            this.stallWatchdogTimer = null;
        }

        this.audioActivityMonitor?.stop();
        this.audioActivityMonitor = null;
    }
}
