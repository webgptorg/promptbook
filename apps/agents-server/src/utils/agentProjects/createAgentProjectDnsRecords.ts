/**
 * DNS record types supported by generated agent project domains.
 *
 * @private helper for the Agents Server project DNS instructions
 */
export type AgentProjectDnsRecordType = 'A' | 'CNAME';

/**
 * One generated agent project DNS record instruction.
 *
 * @private helper for the Agents Server project DNS instructions
 */
export type AgentProjectDnsRecord = {
    /**
     * DNS record type.
     */
    readonly type: AgentProjectDnsRecordType;

    /**
     * Full hostname to enter as the DNS record name.
     */
    readonly name: string;

    /**
     * DNS record target value.
     */
    readonly value: string;

    /**
     * Explanation of the selected record.
     */
    readonly note: string;
};

/**
 * Placeholder used when preventive project DNS guidance has no assigned project domain yet.
 *
 * @private helper for the Agents Server project DNS instructions
 */
const PROJECT_DOMAIN_NAME_PLACEHOLDER = '<PROJECT_NAME>';

/**
 * Inputs used to create one project DNS record instruction.
 *
 * @private helper for the Agents Server project DNS instructions
 */
type CreateAgentProjectDnsRecordOptions = {
    /**
     * Whether the resulting DNS record should be a CNAME instead of an A record.
     */
    readonly isCnameRecord: boolean;

    /**
     * Whether the resulting DNS record should cover every generated project domain.
     */
    readonly isWildcardDomain: boolean;

    /**
     * Assigned project hostname used by the single-project variant, when available.
     */
    readonly projectDomain?: string | null;

    /**
     * Public VPS IP address used by the A-record variant, when known.
     */
    readonly publicIpAddress: string | null | undefined;

    /**
     * Base server domain used by generated project hostnames.
     */
    readonly serverDomain: string;
};

/**
 * Creates the one DNS record shown for a selected project-domain setup.
 *
 * @param options - Project domain, server domain, and selected DNS variants.
 * @returns One DNS record instruction.
 */
export function createAgentProjectDnsRecord(options: CreateAgentProjectDnsRecordOptions): AgentProjectDnsRecord {
    const name = createAgentProjectDnsRecordName(options);

    if (options.isCnameRecord) {
        return {
            type: 'CNAME',
            name,
            value: options.serverDomain,
            note: `Use this only when \`${options.serverDomain}\` already resolves to this server.`,
        };
    }

    return {
        type: 'A',
        name,
        value: options.publicIpAddress || '<VPS_PUBLIC_IP>',
        note: options.publicIpAddress
            ? 'Point this hostname directly to the VPS public IP address.'
            : 'Replace <VPS_PUBLIC_IP> with the public IP address of this VPS.',
    };
}

/**
 * Resolves the DNS hostname displayed for one project DNS record instruction.
 *
 * @private helper for createAgentProjectDnsRecord
 */
function createAgentProjectDnsRecordName(options: CreateAgentProjectDnsRecordOptions): string {
    if (options.isWildcardDomain) {
        return `*.${options.serverDomain}`;
    }

    return options.projectDomain || `${PROJECT_DOMAIN_NAME_PLACEHOLDER}.${options.serverDomain}`;
}
