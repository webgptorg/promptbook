import { isIPv4, isIPv6 } from 'net';

/**
 * Checks if the IP address is allowed based on the allowed IPs list
 *
 * @param clientIp - The IP address of the client
 * @param allowedIps - Comma separated list of allowed IPs or CIDR ranges
 * @returns true if the IP is allowed, false otherwise
 */
export function isIpAllowed(clientIp: string, allowedIps: string | null | undefined): boolean {
    if (!allowedIps || allowedIps.trim() === '') {
        return true;
    }

    const allowedList = allowedIps.split(',').map((ip) => ip.trim());

    for (const allowed of allowedList) {
        if (allowed === '') {
            continue;
        }

        if (allowed.includes('/')) {
            // CIDR
            if (isIpInCidr(clientIp, allowed)) {
                return true;
            }
        } else {
            // Single IP
            if (clientIp === allowed) {
                return true;
            }
        }
    }

    return false;
}

function isIpInCidr(ip: string, cidr: string): boolean {
    try {
        const [range, bitsStr] = cidr.split('/');
        const bits = parseInt(bitsStr, 10);

        if (isIPv4(ip) && isIPv4(range)) {
            return isIPv4InCidr(ip, range, bits);
        } else if (isIPv6(ip) && isIPv6(range)) {
            return isIPv6InCidr(ip, range, bits);
        } else if (isIPv6(ip) && isIPv4(range)) {
            // Check if IPv6 is IPv4-mapped
            if (ip.startsWith('::ffff:')) {
                return isIPv4InCidr(ip.substring(7), range, bits);
            }
        }
    } catch (error) {
        console.error(`Error checking CIDR ${cidr} for IP ${ip}:`, error);
    }
    return false;
}

function ipToLong(ip: string): number {
    return (
        ip.split('.').reduce((acc, octet) => {
            return (acc << 8) + parseInt(octet, 10);
        }, 0) >>> 0
    );
}

function isIPv4InCidr(ip: string, range: string, bits: number): boolean {
    const mask = ~((1 << (32 - bits)) - 1);
    const ipLong = ipToLong(ip);
    const rangeLong = ipToLong(range);

    return (ipLong & mask) === (rangeLong & mask);
}

function parseIPv6(ip: string): bigint {
    // Expand ::
    let fullIp = ip;
    if (ip.includes('::')) {
        const parts = ip.split('::');
        const left = parts[0].split(':').filter(Boolean);
        const right = parts[1].split(':').filter(Boolean);
        const missing = 8 - (left.length + right.length);
        const zeros = Array(missing).fill('0');
        fullIp = [...left, ...zeros, ...right].join(':');
    }

    const parts = fullIp.split(':');
    let value = BigInt(0);
    for (const part of parts) {
        value = (value << BigInt(16)) + BigInt(parseInt(part || '0', 16));
    }
    return value;
}

function isIPv6InCidr(ip: string, range: string, bits: number): boolean {
    const ipBigInt = parseIPv6(ip);
    const rangeBigInt = parseIPv6(range);
    const mask = (BigInt(1) << BigInt(128)) - BigInt(1) ^ ((BigInt(1) << BigInt(128 - bits)) - BigInt(1));

    return (ipBigInt & mask) === (rangeBigInt & mask);
}
