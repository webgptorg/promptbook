import type { DnsRecordInstruction } from '../dnsRecords/DnsRecordInstruction';
import { buildStalwartMailServerHostname } from './stalwartMailBridge';

/**
 * One DNS record required or recommended for reliable mail delivery.
 */
export type EmailDnsInstruction = DnsRecordInstruction & {
    /**
     * DNS record type required or recommended for Stalwart email delivery.
     */
    readonly type: 'A' | 'CAA' | 'MX' | 'TXT';
};

/**
 * Creates the domain-specific baseline DNS records for Stalwart email.
 *
 * DKIM records are intentionally read from Stalwart's generated zone because their public keys must never be guessed.
 */
export function createEmailDnsInstructions(domain: string, publicIpAddress?: string | null): EmailDnsInstruction[] {
    const mailServerHostname = buildStalwartMailServerHostname(domain);
    const resolvedPublicIpAddress = publicIpAddress?.trim() || '<VPS_PUBLIC_IP>';

    return [
        {
            type: 'A',
            name: mailServerHostname,
            value: resolvedPublicIpAddress,
            note: 'Mail server host. Use the same public IPv4 address as this VPS.',
        },
        {
            type: 'MX',
            name: domain,
            value: `10 ${mailServerHostname}.`,
            note: 'Routes inbound mail for the Agents Server domain to Stalwart.',
        },
        {
            type: 'TXT',
            name: domain,
            value: 'v=spf1 mx -all',
            note: 'SPF permits only this domain’s MX host to send mail.',
        },
        {
            type: 'TXT',
            name: `_dmarc.${domain}`,
            value: `v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@${domain}; adkim=s; aspf=s`,
            note: 'DMARC requests strict alignment and aggregate reports.',
        },
        {
            type: 'TXT',
            name: `_smtp._tls.${domain}`,
            value: `v=TLSRPTv1; rua=mailto:tls-reports@${domain}`,
            note: 'Receives reports about TLS delivery failures.',
        },
        {
            type: 'A',
            name: `mta-sts.${domain}`,
            value: resolvedPublicIpAddress,
            note: 'Hosts the HTTPS MTA-STS policy for this mail domain.',
        },
        {
            type: 'TXT',
            name: `_mta-sts.${domain}`,
            value: 'v=STSv1; id=20260725',
            note: 'Advertises the current MTA-STS policy version. Change the id whenever the policy changes.',
        },
        {
            type: 'CAA',
            name: domain,
            value: '0 issue "letsencrypt.org"',
            note: 'Authorizes Let’s Encrypt to issue the public SMTP and MTA-STS TLS certificates.',
        },
    ];
}
