import { UnexpectedError } from '@promptbook-source/errors/UnexpectedError';
import { spaceTrim } from 'spacetrim';

/**
 * Canonical identity of the `ptbk coder` landing page.
 *
 * Note: This is the single source of truth for every title, description and URL used by
 *       the page metadata, the sharing image, the structured data, `sitemap.xml` and `robots.txt`,
 *       specified in [`specs/metadata.md`](../../specs/metadata.md)
 */

/**
 * Longest `<title>` which is shown in Google search results without being truncated.
 */
const MAX_SITE_TITLE_LENGTH = 60;

/**
 * Longest `<meta name="description">` which is shown in Google search results without being truncated.
 */
const MAX_SITE_DESCRIPTION_LENGTH = 160;

/**
 * Longest description which social networks show in a sharing preview without being truncated.
 */
const MAX_SITE_SOCIAL_DESCRIPTION_LENGTH = 200;

/**
 * Returns one piece of metadata copy, but only when it is short enough for search results and sharing previews.
 *
 * @throws {UnexpectedError} When the text would be truncated by search engines or social networks
 */
function validateMetadataTextLength(metadataName: string, text: string, maximumLength: number): string {
    if (text.length > maximumLength) {
        throw new UnexpectedError(
            spaceTrim(`
                Metadata \`${metadataName}\` is **${text.length} characters** long,
                but only **${maximumLength} characters** fit into search results and sharing previews.

                Shorten it in \`siteMetadata.ts\`, the text was:

                > ${text}
            `),
        );
    }

    return text;
}

/**
 * Canonical origin of the landing page, used to make every metadata URL absolute.
 */
export const SITE_URL = 'https://coder.ptbk.io';

/**
 * Returns the absolute URL of one path on the landing page.
 */
export function resolveSiteUrl(path: string): string {
    return new URL(path, SITE_URL).href;
}

/**
 * Bare domain of the landing page, shown wherever the URL is presented as branding.
 */
export const SITE_DOMAIN = new URL(SITE_URL).host;

/**
 * First word of the product name, which is the name of the `ptbk` command itself.
 */
export const SITE_NAME_LEAD = 'ptbk';

/**
 * Second, highlighted word of the product name, which is the `coder` subcommand.
 */
export const SITE_NAME_ACCENT = 'coder';

/**
 * Name of the product the page is about, written exactly as the command which starts it.
 */
export const SITE_NAME = `${SITE_NAME_LEAD} ${SITE_NAME_ACCENT}`;

/**
 * Name of the product spelled out for readers who do not know the `ptbk` command yet.
 */
export const SITE_ALTERNATE_NAME = 'Promptbook Coder';

/**
 * First half of the page tagline, matching the first line of the hero headline.
 */
export const SITE_TAGLINE_LEAD = 'Your coding agents,';

/**
 * Second, highlighted half of the page tagline, matching the second line of the hero headline.
 */
export const SITE_TAGLINE_ACCENT = 'running your backlog';

/**
 * Tagline of the page, used as the second half of the `<title>`.
 */
export const SITE_TAGLINE = `${SITE_TAGLINE_LEAD} ${SITE_TAGLINE_ACCENT}`;

/**
 * Title of the page, shown in search results, browser tabs and sharing previews.
 */
export const SITE_TITLE = validateMetadataTextLength(
    'SITE_TITLE',
    `${SITE_NAME}: ${SITE_TAGLINE}`,
    MAX_SITE_TITLE_LENGTH,
);

/**
 * Description of the page, shown below the title in search results.
 */
export const SITE_DESCRIPTION = validateMetadataTextLength(
    'SITE_DESCRIPTION',
    'ptbk coder drives Claude Code, OpenAI Codex and other coding agents through a queue of markdown prompts. It tests, commits and pushes every change.',
    MAX_SITE_DESCRIPTION_LENGTH,
);

/**
 * Description of the page, shown in sharing previews on social networks and in chat apps.
 */
export const SITE_SOCIAL_DESCRIPTION = validateMetadataTextLength(
    'SITE_SOCIAL_DESCRIPTION',
    'Queue your backlog as plain markdown prompts. The coding agent you already use implements, tests and commits them one by one, unattended.',
    MAX_SITE_SOCIAL_DESCRIPTION_LENGTH,
);

/**
 * Search terms the page should be found by.
 *
 * Note: Ordered from the most specific to the most generic term.
 */
export const SITE_KEYWORDS: ReadonlyArray<string> = [
    'ptbk coder',
    'Promptbook',
    'coding agent orchestration',
    'autonomous coding agent',
    'AI coding agent',
    'prompt queue',
    'Claude Code',
    'OpenAI Codex',
    'GitHub Copilot',
    'Gemini CLI',
    'opencode',
    'Cline',
];

/**
 * Language of the page as an IETF language tag, used for the `lang` attribute and structured data.
 */
export const SITE_LANGUAGE = 'en';

/**
 * Locale of the page in the Open Graph format.
 */
export const SITE_LOCALE = 'en_US';

/**
 * Brand which publishes the page and the product.
 */
export const PUBLISHER_NAME = 'Promptbook';

/**
 * Company behind the brand, as registered in the Czech business register.
 */
export const PUBLISHER_LEGAL_NAME = 'AI Web s.r.o.';

/**
 * Path of the favicon of the page.
 */
export const SITE_FAVICON_PATH = '/favicon.ico';

/**
 * Path of the square brand logo, used as the touch icon and as the logo in structured data.
 */
export const SITE_LOGO_PATH = '/logo-blue-white-256.png';

/**
 * Path of the brand logo on a transparent background, used on dark surfaces like the sharing image.
 */
export const SITE_LOGO_ON_DARK_PATH = '/logo-white-transparent-1024.png';

/**
 * Background color of the page, reported to browsers as the theme color.
 *
 * Note: Same value as `promptbook-dark-gray` in [`tailwind.config.ts`](../../tailwind.config.ts)
 */
export const SITE_THEME_COLOR = '#111827';
