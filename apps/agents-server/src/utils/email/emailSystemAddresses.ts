/**
 * Mailboxes which are handled operationally instead of being routed to agents.
 */
export const EMAIL_SYSTEM_LOCAL_PARTS = [
    'postmaster',
    'dmarc-reports',
    'tls-reports',
] as const;

/**
 * Returns true when a normalized recipient belongs to a reserved operational mailbox.
 */
export function isEmailSystemLocalPart(localPart: string): boolean {
    return EMAIL_SYSTEM_LOCAL_PARTS.some((systemLocalPart) => systemLocalPart === localPart);
}
