import { JSDOM } from 'jsdom';
import { posix } from 'path';
import type { AgentProjectIndexHtml } from './readAgentProjectIndexHtml';

/**
 * Base URL used solely to resolve relative icon links from a project root index file.
 */
const PROJECT_INDEX_HTML_BASE_URL = 'https://project.invalid/';

/**
 * Parsed display metadata from one project HTML entrypoint.
 */
export type AgentProjectIndexHtmlMetadata = {
    /**
     * Plain-text HTML document title, or null when no usable title is present.
     */
    readonly title: string | null;

    /**
     * Local project-relative paths declared as favicon links, ordered by document priority.
     */
    readonly faviconRelativePaths: ReadonlyArray<string>;
};

/**
 * Parses the title and local favicon references from a project HTML entrypoint.
 *
 * @param indexHtml - Optional root HTML entrypoint.
 * @returns Parsed title and favicon references.
 */
export function parseAgentProjectIndexHtml(indexHtml: AgentProjectIndexHtml | null): AgentProjectIndexHtmlMetadata {
    if (!indexHtml) {
        return {
            title: null,
            faviconRelativePaths: [],
        };
    }

    const document = new JSDOM(indexHtml.content).window.document;
    const faviconRelativePaths = [
        ...new Set(
            [...document.querySelectorAll<HTMLLinkElement>('link[rel][href]')]
                .filter(isFaviconLink)
                .map((faviconLink) => resolveLocalFaviconRelativePath(faviconLink.getAttribute('href')))
                .filter((faviconRelativePath): faviconRelativePath is string => faviconRelativePath !== null),
        ),
    ];

    return {
        title: normalizeIndexHtmlTitle(document.querySelector('title')?.textContent),
        faviconRelativePaths,
    };
}

/**
 * Returns whether an HTML link declares a favicon relation.
 *
 * @param faviconLink - Candidate link element.
 * @returns True when the link has the standard icon relation.
 */
function isFaviconLink(faviconLink: HTMLLinkElement): boolean {
    return (faviconLink.getAttribute('rel') || '').toLowerCase().split(/\s+/u).includes('icon');
}

/**
 * Resolves a local favicon href to a safe project-relative file path.
 *
 * @param rawHref - Raw href value from the icon link.
 * @returns Normalized project-relative path, or null for external and invalid hrefs.
 */
function resolveLocalFaviconRelativePath(rawHref: string | null): string | null {
    if (!rawHref?.trim()) {
        return null;
    }

    try {
        const faviconUrl = new URL(rawHref, PROJECT_INDEX_HTML_BASE_URL);
        if (faviconUrl.origin !== new URL(PROJECT_INDEX_HTML_BASE_URL).origin) {
            return null;
        }

        const faviconRelativePath = posix
            .normalize(decodeURIComponent(faviconUrl.pathname))
            .replace(/^\/+/u, '')
            .replace(/^\.\//u, '');

        if (
            !faviconRelativePath ||
            faviconRelativePath === '.' ||
            faviconRelativePath === '..' ||
            faviconRelativePath.startsWith('../') ||
            faviconRelativePath.includes('\\')
        ) {
            return null;
        }

        return faviconRelativePath;
    } catch {
        return null;
    }
}

/**
 * Normalizes an HTML title to compact display text.
 *
 * @param rawTitle - Raw title text parsed from HTML.
 * @returns Compact title or null when blank.
 */
function normalizeIndexHtmlTitle(rawTitle: string | null | undefined): string | null {
    const title = (rawTitle || '').replace(/\s+/gu, ' ').trim();

    return title || null;
}
