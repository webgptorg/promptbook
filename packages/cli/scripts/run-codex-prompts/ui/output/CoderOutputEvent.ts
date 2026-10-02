/** Display selection belongs only to this dashboard invocation. */
export type CoderOutputMode = 'normal' | 'raw';

/** Observable output categories; these never drive runner state. */
export type CoderOutputKind =
    | 'agent'
    | 'reasoning'
    | 'tool'
    | 'files'
    | 'verification'
    | 'result'
    | 'warning'
    | 'error'
    | 'status'
    | 'unknown';

/** A bounded presentation entry, separate from the original harness chunks and durable trace. */
export type CoderOutputEvent = {
    readonly id?: string;
    readonly kind: CoderOutputKind;
    readonly title: string;
    readonly text: string;
    readonly isDelta?: boolean;
};

/** Permissive protocol object: all fields are checked at the presentation boundary. */
export type CoderOutputRecord = Record<string, unknown>;

/** Safely reads an object from an unknown protocol field. */
export function outputRecord(value: unknown): CoderOutputRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as CoderOutputRecord) : {};
}

/** Safely reads a string without interpreting arbitrary objects as prose. */
export function outputText(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

/** Safely reads arrays containing protocol records. */
export function outputRecords(value: unknown): CoderOutputRecord[] {
    return Array.isArray(value) ? value.map(outputRecord) : [];
}
