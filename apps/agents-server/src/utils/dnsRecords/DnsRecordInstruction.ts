/**
 * Whether every shown DNS record has to be configured or just one of the shown alternatives.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export type DnsRecordSelection = 'all' | 'one';

/**
 * One DNS record shown to an Agents Server administrator for configuration at a DNS provider.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export type DnsRecordInstruction = {
    /**
     * DNS record type.
     */
    readonly type: string;

    /**
     * Fully qualified DNS record name.
     */
    readonly name: string;

    /**
     * DNS record value to configure.
     */
    readonly value: string;

    /**
     * Explanation of when or why this record is needed.
     */
    readonly note: string | null;
};
