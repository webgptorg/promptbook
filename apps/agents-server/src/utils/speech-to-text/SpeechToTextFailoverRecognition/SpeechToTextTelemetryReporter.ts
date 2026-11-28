import type { SpeechToTextTelemetryEvent } from './SpeechToTextTelemetryEvent';

type SpeechToTextTelemetryReporterOptions = {
    readonly onTelemetry?: (event: SpeechToTextTelemetryEvent) => void;
    readonly telemetryEndpoint?: string;
};

/**
 * Best-effort telemetry sink used by `SpeechToTextFailoverRecognition`.
 *
 * @private function of SpeechToTextFailoverRecognition
 */
export class SpeechToTextTelemetryReporter {
    public constructor(private readonly options: SpeechToTextTelemetryReporterOptions) {}

    /**
     * Emits one telemetry event to all configured sinks.
     */
    public emit(event: SpeechToTextTelemetryEvent): void {
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
