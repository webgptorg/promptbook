// Utility to generate content for robots.txt, security.txt, and humans.txt [DRY]

// Get base URL from environment or config
const baseUrl = process.env.PUBLIC_URL || 'https://your-agents-server-domain.com';

export function generateRobotsTxt(): string {
    return [
        'User-agent: *',
        `Sitemap: ${baseUrl}/sitemap.xml`,
        '',
    ].join('\n');
}

export function generateSecurityTxt(): string {
    // See https://securitytxt.org/ for more fields
    return [
        `Contact: mailto:security@${baseUrl.replace(/^https?:\/\//, '')}`,
        `Expires: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`,
        `Canonical: ${baseUrl}/.well-known/security.txt`,
        '',
    ].join('\n');
}

export function generateHumansTxt(): string {
    return [
        '/* TEAM */',
        'Developer: Promptbook Agents Server Team',
        `Site: ${baseUrl}`,
        '',
        '/* THANKS */',
        'Thanks: All contributors and users!',
        '',
        '/* GENERATED DYNAMICALLY */',
    ].join('\n');
}
