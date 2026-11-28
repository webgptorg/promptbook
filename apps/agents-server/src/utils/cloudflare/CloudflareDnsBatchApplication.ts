/**
 * What happened with one DNS record during a batch import into Cloudflare.
 */
export type CloudflareDnsBatchRecordStatus = 'created' | 'updated' | 'unchanged' | 'skipped' | 'failed';

/**
 * Result of importing one DNS record from the DNS manual into Cloudflare.
 */
export type CloudflareDnsBatchRecordResult = {
    /**
     * DNS record type.
     */
    readonly type: string;

    /**
     * Fully qualified DNS record name.
     */
    readonly name: string;

    /**
     * DNS record value from the DNS manual.
     */
    readonly value: string;

    /**
     * What happened with the record.
     */
    readonly status: CloudflareDnsBatchRecordStatus;

    /**
     * Human-readable explanation shown in the wizard.
     */
    readonly message: string;
};

/**
 * Result of importing all DNS records of one manual into Cloudflare.
 */
export type CloudflareDnsBatchApplication = {
    /**
     * Cloudflare zone which received the records.
     */
    readonly zoneName: string;

    /**
     * Result of every imported record.
     */
    readonly results: ReadonlyArray<CloudflareDnsBatchRecordResult>;
};
