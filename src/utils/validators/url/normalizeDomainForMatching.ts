/**
 * Normalizes a domain-like string into a comparable hostname form.
 *
 * The returned value is lowercased and stripped to hostname only
 * (protocol, path, query, hash, and port are removed).
 *
 * @param rawDomain - Raw domain value (for example `my-agent.com` or `https://my-agent.com/path`).
 * @returns Normalized hostname or `null` when the value cannot be normalized.
 * @private utility for host/domain matching
 */
export function normalizeDomainForMatching(rawDomain: string): string | null {
    const trimmedDomain = rawDomain.trim();
    if (!trimmedDomain) {
        return null;
    }

    const candidateUrl = hasHttpProtocol(trimmedDomain) ? trimmedDomain : `https://${trimmedDomain}`;

    try {
        const parsedUrl = new URL(candidateUrl);
        const normalizedHostname = parsedUrl.hostname.trim().toLowerCase();
        return normalizedHostname || null;
    } catch {
        return null;
    }
}

/**
 * Checks whether the value already includes an HTTP(S) protocol prefix.
 *
 * @param value - Raw value to inspect.
 * @returns True when the value starts with `http://` or `https://`.
 * @private utility for host/domain matching
 */
function hasHttpProtocol(value: string): boolean {
    return value.startsWith('http://') || value.startsWith('https://');
}
