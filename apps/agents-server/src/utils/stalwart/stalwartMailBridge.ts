/**
 * Local part of the single mailbox which receives all agent aliases of one domain.
 */
export const STALWART_MAIL_BRIDGE_LOCAL_PART = 'promptbook-mailbridge';

/**
 * Builds the canonical public hostname of the Stalwart SMTP server for one Agents Server domain.
 */
export function buildStalwartMailServerHostname(domain: string): string {
    return `mail.${domain}`;
}

/**
 * Builds the address of the mail bridge mailbox which is also the catch-all address of one domain.
 */
export function buildStalwartMailBridgeAddress(domain: string): string {
    return `${STALWART_MAIL_BRIDGE_LOCAL_PART}@${domain}`;
}

/**
 * Builds the Agents Server endpoint which Stalwart calls for every message delivered to one domain.
 */
export function buildStalwartInboundHookUrl(domain: string): string {
    return `https://${domain}/api/emails/incoming/stalwart`;
}
