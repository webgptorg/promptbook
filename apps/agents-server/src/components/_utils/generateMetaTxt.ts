// Utility to generate content for robots.txt, security.txt, and humans.txt [DRY]

import { $provideServer } from '@/src/tools/$provideServer';

export async function generateRobotsTxt(): Promise<string> {
    const { publicUrl } = await $provideServer();
    return ['User-agent: *', `Sitemap: ${publicUrl.href}sitemap.xml`, ''].join('\n');
}

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

export async function generateHumansTxt(): Promise<string> {
    const { publicUrl } = await $provideServer();
    return ['/* TEAM */', 'Developer: Promptbook Team', `Site: https://ptbk.io`, `Instance: ${publicUrl.href}`].join(
        '\n',
    );
}

/**
 * TODO: Use `spaceTrim`
 */
