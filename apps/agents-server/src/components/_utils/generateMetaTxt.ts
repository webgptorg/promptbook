// Utility to generate content for robots.txt, security.txt, and humans.txt [DRY]

import { $provideServer } from '@/src/tools/$provideServer';
import { getServerVisibility } from '@/src/utils/getServerVisibility';
import { isPublicServerVisibility } from '@/src/utils/serverVisibility';

/**
 * Agent sub-routes that should not be indexed directly.
 */
const AGENT_PROFILE_DISALLOWED_SUBPATHS = [
    '/agents/*/api/',
    '/agents/*/book',
    '/agents/*/book+chat',
    '/agents/*/chat',
    '/agents/*/export-as-transpiled-code',
    '/agents/*/history',
    '/agents/*/images',
    '/agents/*/integration',
    '/agents/*/system-message',
    '/agents/*/timeouts',
    '/agents/*/website-integration',
] as const;

/**
 * Global routes that are not intended for search indexing.
 */
const GLOBAL_DISALLOWED_PATHS = [
    '/admin/',
    '/api/',
    '/recycle-bin/',
    '/restricted',
    '/search',
    '/system/',
] as const;

/**
 * Builds static line set for a private robots policy.
 *
 * @returns Robots lines for private servers.
 */
function createPrivateRobotsTxtLines(): ReadonlyArray<string> {
    return ['User-agent: *', 'Disallow: /'];
}

/**
 * Builds static line set for a public robots policy.
 *
 * @param sitemapUrl - Absolute sitemap index URL.
 * @returns Robots lines for public servers.
 */
function createPublicRobotsTxtLines(sitemapUrl: string): ReadonlyArray<string> {
    return [
        'User-agent: *',
        'Allow: /',
        ...AGENT_PROFILE_DISALLOWED_SUBPATHS.map((path) => `Disallow: ${path}`),
        ...GLOBAL_DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
        `Sitemap: ${sitemapUrl}`,
    ];
}

/**
 * Converts robots line arrays into canonical text output.
 *
 * @param lines - Robots directives.
 * @returns Serialized robots.txt content.
 */
function stringifyRobotsTxt(lines: ReadonlyArray<string>): string {
    return [...lines, ''].join('\n');
}

/**
 * Builds the dynamic `robots.txt` content for this server instance.
 *
 * @returns Robots file text.
 */
export async function generateRobotsTxt(): Promise<string> {
    const { publicUrl } = await $provideServer();
    const serverVisibility = await getServerVisibility();

    if (!isPublicServerVisibility(serverVisibility)) {
        return stringifyRobotsTxt(createPrivateRobotsTxtLines());
    }

    return stringifyRobotsTxt(createPublicRobotsTxtLines(`${publicUrl.href}sitemap.xml`));
}

/**
 * Builds the dynamic `security.txt` content for this server instance.
 *
 * @returns Security file text.
 */
export async function generateSecurityTxt(): Promise<string> {
    const { publicUrl } = await $provideServer();
    // See https://securitytxt.org/ for more fields
    return [
        `Contact: mailto:security@ptbk.io`,
        `Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
        `Canonical: ${publicUrl.href}security.txt`,
        '',
    ].join('\n');
}

/**
 * Builds the dynamic `humans.txt` content for this server instance.
 *
 * @returns Humans file text.
 */
export async function generateHumansTxt(): Promise<string> {
    const { publicUrl } = await $provideServer();
    return ['/* TEAM */', 'Developer: Promptbook Team', `Site: https://ptbk.io`, `Instance: ${publicUrl.href}`].join(
        '\n',
    );
}

// TODO: Use `spaceTrim`
