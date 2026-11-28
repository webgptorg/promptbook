/**
 * Payload forwarded through speech telemetry hooks.
 *
 * @private type of SpeechToTextFailoverRecognition
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
