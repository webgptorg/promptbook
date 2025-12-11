// Utility to generate content for robots.txt, security.txt, and humans.txt [DRY]

import { NEXT_PUBLIC_SITE_URL } from '@/config';

// Get base URL from environment or config
const baseUrl = NEXT_PUBLIC_SITE_URL?.href || process.env.PUBLIC_URL || 'https://ptbk.io';

export function generateRobotsTxt(): string {
    return ['User-agent: *', `Sitemap: ${baseUrl}sitemap.xml`, ''].join('\n');
}

export function generateSecurityTxt(): string {
    // See https://securitytxt.org/ for more fields
    return [
        `Contact: mailto:security@ptbk.io`,
        `Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
        `Canonical: ${baseUrl}security.txt`,
        '',
    ].join('\n');
}

export function generateHumansTxt(): string {
    return ['/* TEAM */', 'Developer: Promptbook Team', `Site: https://ptbk.io`, `Instance: ${baseUrl}`].join('\n');
}

/**
 * TODO: Use `spaceTrim`
 */
