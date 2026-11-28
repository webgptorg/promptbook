/**
 * Envelope mailbox included in a Stalwart MTA hook request.
 */
export type StalwartMtaHookMailbox = {
    readonly address: string;
    readonly parameters?: Readonly<Record<string, unknown>> | null;
};

/**
 * DATA-stage payload sent by Stalwart to the Agents Server.
 */
export type StalwartMtaHookPayload = {
    readonly context?: {
        readonly stage?: string;
        readonly queue?: {
            readonly id?: string;
        };
        readonly sasl?: {
            readonly login?: string;
        } | null;
    };
    readonly envelope?: {
        readonly from?: StalwartMtaHookMailbox | null;
        readonly to?: ReadonlyArray<StalwartMtaHookMailbox>;
    };
    readonly message?: {
        readonly headers?: ReadonlyArray<readonly [string, string]>;
        readonly serverHeaders?: ReadonlyArray<readonly [string, string]>;
        readonly contents?: string;
        readonly size?: number;
    };
};
