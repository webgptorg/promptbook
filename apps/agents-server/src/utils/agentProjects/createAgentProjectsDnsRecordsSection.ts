import type { DnsRecordsSection, DnsRecordsSectionVariant } from '../dnsRecords/DnsRecordsSection';
import { createAgentProjectDnsRecord } from './createAgentProjectDnsRecords';

/**
 * Inputs of the generated project domain DNS section.
 *
 * @private helper for the Agents Server project DNS instructions
 */
type CreateAgentProjectsDnsRecordsSectionOptions = {
    /**
     * Whether at least one generated project domain currently fails DNS verification.
     */
    readonly isDnsIssue?: boolean;

    /**
     * Example generated project domain used by the single-project variants, when one already exists.
     */
    readonly projectDomain?: string | null;

    /**
     * Public VPS IP address, when known by the server.
     */
    readonly publicIpAddress: string | null | undefined;

    /**
     * Base server domain used by generated project domains.
     */
    readonly serverDomain: string;
};

/**
 * Creates the DNS section which publishes the generated agent project domains.
 *
 * Exactly one of the variants has to be configured, because the wildcard and the single-project records as well as
 * the A and the CNAME records would collide on the same hostname.
 *
 * @param options - Server domain, example project domain, and the public VPS IP address.
 * @returns Generated project domain section.
 *
 * @private shared by the Agents Server DNS instruction views
 */
export function createAgentProjectsDnsRecordsSection(
    options: CreateAgentProjectsDnsRecordsSectionOptions,
): DnsRecordsSection {
    return {
        id: 'agent-projects',
        title: `Project domains under ${options.serverDomain}`,
        description: `Project URLs use a subdomain of ${options.serverDomain}. Configure exactly one of the following setups; do not add both the single-project and the wildcard records, or both the A and the CNAME record for the same hostname.`,
        variantsLabel: 'Project domain setup',
        variants: [
            createAgentProjectsDnsRecordsSectionVariant(options, { isWildcardDomain: true, isCnameRecord: true }),
            createAgentProjectsDnsRecordsSectionVariant(options, { isWildcardDomain: true, isCnameRecord: false }),
            createAgentProjectsDnsRecordsSectionVariant(options, { isWildcardDomain: false, isCnameRecord: true }),
            createAgentProjectsDnsRecordsSectionVariant(options, { isWildcardDomain: false, isCnameRecord: false }),
        ],
        statusSummary: options.isDnsIssue
            ? 'One or more generated project domains do not resolve to this VPS yet. The recommended wildcard CNAME setup is selected below.'
            : null,
        isDnsIssue: options.isDnsIssue,
    };
}

/**
 * Creates one selectable generated project domain setup.
 *
 * @param options - Inputs of the whole section.
 * @param variant - Selected domain coverage and record type.
 * @returns One section variant with its single DNS record.
 *
 * @private function of `createAgentProjectsDnsRecordsSection`
 */
function createAgentProjectsDnsRecordsSectionVariant(
    options: CreateAgentProjectsDnsRecordsSectionOptions,
    variant: {
        /**
         * Whether the variant covers every generated project domain.
         */
        readonly isWildcardDomain: boolean;

        /**
         * Whether the variant uses a CNAME instead of an A record.
         */
        readonly isCnameRecord: boolean;
    },
): DnsRecordsSectionVariant {
    const { isCnameRecord, isWildcardDomain } = variant;

    return {
        id: `${isWildcardDomain ? 'wildcard' : 'single-project'}-${isCnameRecord ? 'cname' : 'a'}`,
        label: isWildcardDomain
            ? isCnameRecord
                ? 'Wildcard CNAME (all projects, recommended)'
                : 'Wildcard A record (all projects)'
            : isCnameRecord
            ? 'Single project CNAME'
            : 'Single project A record',
        description: isWildcardDomain
            ? `This covers all generated project domains under ${options.serverDomain}.`
            : options.projectDomain
            ? `This covers one project, for example ${options.projectDomain}. Repeat it for each project that needs a public URL.`
            : 'This covers one generated project. Replace the project name placeholder above with its full hostname.',
        recordSelection: 'one',
        records: [
            createAgentProjectDnsRecord({
                isCnameRecord,
                isWildcardDomain,
                projectDomain: options.projectDomain,
                publicIpAddress: options.publicIpAddress,
                serverDomain: options.serverDomain,
            }),
        ],
    };
}
