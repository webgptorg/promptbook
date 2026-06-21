import { isIPv4, isIPv6 } from 'net';
import { spaceTrim } from 'spacetrim';

/**
 * Private IPv4 CIDR ranges that must never be reached via the scrape proxy.
 * Covers loopback, RFC 1918 private ranges, link-local (APIPA / cloud metadata),
 * and the shared address space (RFC 6598).
 */
const PRIVATE_IPV4_RANGES: ReadonlyArray<{ readonly network: string; readonly prefixBits: number }> = [
    { network: '127.0.0.0', prefixBits: 8 }, // loopback
    { network: '10.0.0.0', prefixBits: 8 }, // RFC 1918
    { network: '172.16.0.0', prefixBits: 12 }, // RFC 1918
    { network: '192.168.0.0', prefixBits: 16 }, // RFC 1918
    { network: '169.254.0.0', prefixBits: 16 }, // link-local / AWS metadata (169.254.169.254)
    { network: '0.0.0.0', prefixBits: 8 }, // "this" network
    { network: '100.64.0.0', prefixBits: 10 }, // shared address space (RFC 6598)
];

/**
 * Converts an IPv4 address string to an unsigned 32-bit integer.
 */
function ipv4ToUint32(ip: string): number {
    return ip.split('.').reduce((accumulator, octet) => (accumulator << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Returns true when the given IPv4 address falls within any private/reserved range.
 */
function isPrivateIPv4(ip: string): boolean {
    const ipAsNumber = ipv4ToUint32(ip);
    for (const { network, prefixBits } of PRIVATE_IPV4_RANGES) {
        const networkMask = prefixBits === 0 ? 0 : (~((1 << (32 - prefixBits)) - 1)) >>> 0;
        if ((ipAsNumber & networkMask) === (ipv4ToUint32(network) & networkMask)) {
            return true;
        }
    }
    return false;
}

/**
 * Returns true when the given IPv6 address falls within any private/reserved range.
 * Covers loopback (::1), unspecified (::), IPv4-mapped addresses (::ffff:A.B.C.D),
 * ULA (fc00::/7), and link-local (fe80::/10).
 */
function isPrivateIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase();

    if (normalized === '::1' || normalized === '::') {
        return true;
    }

    // IPv4-mapped: ::ffff:A.B.C.D — delegate to the IPv4 check
    if (normalized.startsWith('::ffff:')) {
        const ipv4Part = normalized.slice('::ffff:'.length);
        if (isIPv4(ipv4Part)) {
            return isPrivateIPv4(ipv4Part);
        }
    }

    const firstGroup = parseInt((normalized.split(':')[0] ?? '0') || '0', 16);

    // ULA: fc00::/7 — first 7 bits are 1111110
    if ((firstGroup & 0xfe00) === 0xfc00) {
        return true;
    }

    // Link-local: fe80::/10 — first 10 bits are 1111111010
    if ((firstGroup & 0xffc0) === 0xfe80) {
        return true;
    }

    return false;
}

/**
 * Asserts that a URL is safe to use as a scrape target, blocking SSRF attacks.
 *
 * Throws an error when:
 * - The URL scheme is not `http:` or `https:`
 * - The hostname is `localhost`
 * - The hostname is a private/reserved IPv4 address (RFC 1918, loopback, link-local, …)
 * - The hostname is a private/reserved IPv6 address (ULA, link-local, loopback, …)
 *
 * @throws {Error} when the URL would allow reaching an internal/private resource
 */
export function assertSafeUrl(url: string): void {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(url);
    } catch {
        throw new Error(`Invalid URL: \`${url}\``);
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error(spaceTrim(`
            URL scheme \`${parsedUrl.protocol}\` is not allowed.

            Only \`http:\` and \`https:\` schemes are permitted.
        `));
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    if (hostname === 'localhost') {
        throw new Error(
            spaceTrim(`
                Requests to \`localhost\` are not allowed.

                Only public, externally reachable URLs may be scraped.
            `),
        );
    }

    if (isIPv4(hostname) && isPrivateIPv4(hostname)) {
        throw new Error(
            spaceTrim(`
                Requests to private IPv4 address \`${hostname}\` are not allowed.

                Only public, externally reachable URLs may be scraped.
            `),
        );
    }

    // IPv6 addresses appear inside square brackets in URLs: http://[::1]/path
    const ipv6Candidate = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;

    if (isIPv6(ipv6Candidate) && isPrivateIPv6(ipv6Candidate)) {
        throw new Error(
            spaceTrim(`
                Requests to private IPv6 address \`${ipv6Candidate}\` are not allowed.

                Only public, externally reachable URLs may be scraped.
            `),
        );
    }
}
