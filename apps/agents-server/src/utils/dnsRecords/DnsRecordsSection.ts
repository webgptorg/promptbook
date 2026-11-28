import type { ReactNode } from 'react';
import type { DnsRecordGroup } from './DnsRecordInstruction';

/**
 * One alternative setup of a DNS record section.
 *
 * A section with a single variant has nothing to choose from, a section with more variants lets the administrator
 * pick exactly one of them, for example the wildcard or the single-project setup of generated project domains.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export type DnsRecordsSectionVariant = DnsRecordGroup & {
    /**
     * Stable identifier of the variant, unique within its section.
     */
    readonly id: string;

    /**
     * Label of the variant button.
     */
    readonly label: string;

    /**
     * Explanation of what the selected variant covers.
     */
    readonly description?: ReactNode;
};

/**
 * One part of the DNS setup of an Agents Server, for example its domain, its projects, or its email.
 *
 * Every page shows the same sections in the same shared component, just filtered down to the sections which are
 * relevant for that page.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export type DnsRecordsSection = {
    /**
     * Stable identifier of the section, unique within one DNS manual.
     */
    readonly id: string;

    /**
     * Human-readable name of the configured part, for example `Email`.
     */
    readonly title: string;

    /**
     * Explanation of what the section configures.
     */
    readonly description?: ReactNode;

    /**
     * Label shown above the variant buttons.
     */
    readonly variantsLabel?: string;

    /**
     * Alternative setups of the section, at least one of them.
     */
    readonly variants: ReadonlyArray<DnsRecordsSectionVariant>;

    /**
     * Current DNS verification state of the section, when it is known.
     */
    readonly statusSummary?: string | null;

    /**
     * Addresses currently returned by public DNS, when verification is available.
     */
    readonly resolvedAddresses?: ReadonlyArray<string>;

    /**
     * Whether the section currently needs attention.
     */
    readonly isDnsIssue?: boolean;
};
