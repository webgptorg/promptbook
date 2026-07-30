/**
 * Stable identifiers for the Cloudflare DNS setup wizard steps.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
export type CloudflareDnsWizardStep = 'import-with-api-token' | 'import-zone-file' | 'add-manually' | 'check-dns';

/**
 * Labels and order of the Cloudflare DNS setup wizard steps.
 *
 * The two batch steps are alternatives which configure all records at once, the manual step stays available as a
 * fallback for records which cannot be batched.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
export const CLOUDFLARE_DNS_WIZARD_STEPS: ReadonlyArray<{
    /**
     * Stable step identifier.
     */
    readonly id: CloudflareDnsWizardStep;

    /**
     * Label of the step button.
     */
    readonly label: string;

    /**
     * Whether the step configures all records at once.
     */
    readonly isBatchStep: boolean;
}> = [
    { id: 'import-with-api-token', label: 'Import with API token', isBatchStep: true },
    { id: 'import-zone-file', label: 'Import zone file', isBatchStep: true },
    { id: 'add-manually', label: 'Add manually', isBatchStep: false },
    { id: 'check-dns', label: 'Check DNS', isBatchStep: false },
];
