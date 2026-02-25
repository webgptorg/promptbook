// Utility to generate content for robots.txt, security.txt, and humans.txt [DRY]

import { $provideServer } from '@/src/tools/$provideServer';

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
 * Builds the dynamic `robots.txt` content for this server instance.
 *
 * @returns Robots file text.
 */
export async function generateRobotsTxt(): Promise<string> {
    const { publicUrl } = await $provideServer();

    return [
        'User-agent: *',
        'Allow: /agents/',
        'Allow: /docs/',
        ...AGENT_PROFILE_DISALLOWED_SUBPATHS.map((path) => `Disallow: ${path}`),
        ...GLOBAL_DISALLOWED_PATHS.map((path) => `Disallow: ${path}`),
        `Sitemap: ${publicUrl.href}sitemap.xml`,
        '',
    ].join('\n');
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

/**
 * TODO: Use `spaceTrim`
 */
