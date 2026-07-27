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
 * Creates the one DNS record shown for a selected project-domain setup.
 *
 * @param options - Project domain, server domain, and selected DNS variants.
 * @returns One DNS record instruction.
 */
export function createAgentProjectDnsRecord(options: {
    readonly isCnameRecord: boolean;
    readonly isWildcardDomain: boolean;
    readonly projectDomain: string;
    readonly publicIpAddress: string | null | undefined;
    readonly serverDomain: string;
}): AgentProjectDnsRecord {
    const name = options.isWildcardDomain ? `*.${options.serverDomain}` : options.projectDomain;

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
