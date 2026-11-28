import { parseMarkdownSection, splitMarkdownIntoSections } from '@promptbook-local/markdown-utils';
import type { string_markdown } from '@promptbook-local/types';
import { stripMarkdownText } from '../stripMarkdownText';
import { humanizeAgentProjectName } from './humanizeAgentProjectName';
import type { AgentProjectReadme } from './readAgentProjectReadme';

/**
 * Maximum project description length shown in project references.
 */
const PROJECT_DESCRIPTION_MAX_CHARACTERS = 200;

/**
 * Markdown fence prefixes that start non-paragraph blocks.
 */
const MARKDOWN_CODE_FENCE_PREFIXES = ['```', '~~~'] as const;

/**
 * Parsed README sections used to resolve project display metadata.
 */
type AgentProjectReadmeSections = {
    /**
     * First section of the README, including a synthetic title when the README starts with text.
     */
    readonly firstSection: ReturnType<typeof parseMarkdownSection> | null;

    /**
     * First section that comes from an explicit README heading.
     */
    readonly firstExplicitHeadingSection: ReturnType<typeof parseMarkdownSection> | null;
};

/**
 * Project profile values resolved from a project folder, its README and its `index.html`.
 */
export type AgentProjectProfile = {
    /**
     * User-facing project name.
     */
    readonly displayName: string;

    /**
     * Short plain-text project description.
     */
    readonly description: string;

    /**
     * README filename used to resolve the profile, or `null` when missing.
     */
    readonly readmeFileName: string | null;
};

/**
 * Resolves display metadata for one agent project.
 *
 * @param options - Project folder name, optional README content and optional `index.html` title.
 * @returns Project display profile.
 */
export function resolveAgentProjectProfile(options: {
    readonly projectDirectoryName: string;
    readonly readme: AgentProjectReadme | null;
    readonly indexHtmlTitle: string | null;
}): AgentProjectProfile {
    const { projectDirectoryName, readme, indexHtmlTitle } = options;
    const sections = readme === null ? null : parseMarkdownProfileSections(readme.content);

    return {
        displayName: resolveProjectDisplayName({
            projectDirectoryName,
            readmeHeadingTitle: sections?.firstExplicitHeadingSection?.title ?? null,
            indexHtmlTitle,
        }),
        description:
            readme === null
                ? ''
                : resolveProjectDescription(readme.content, sections?.firstSection?.content ?? readme.content),
        readmeFileName: readme?.fileName ?? null,
    };
}

/**
 * Parses README markdown sections through the shared markdown parser.
 *
 * @param markdown - README markdown content.
 * @returns Parsed sections needed for display metadata.
 */
function parseMarkdownProfileSections(markdown: string): AgentProjectReadmeSections {
    const sections = splitMarkdownIntoSections(markdown as string_markdown);
    const firstSection = sections[0];

    if (!firstSection) {
        return {
            firstSection: null,
            firstExplicitHeadingSection: null,
        };
    }

    const parsedFirstSection = parseMarkdownSection(firstSection);
    const firstExplicitHeadingSection = doesMarkdownStartWithHeading(markdown)
        ? parsedFirstSection
        : sections[1]
          ? parseMarkdownSection(sections[1])
          : null;

    return {
        firstSection: parsedFirstSection,
        firstExplicitHeadingSection,
    };
}

/**
 * Resolves a project display name from the README heading, the `index.html` title or the folder name.
 *
 * A project which describes itself neither in a README nor in an `index.html` still gets a readable
 * name, because its folder name is humanized — `prague-murders-map` reads as `Prague Murders Map`.
 *
 * @param options - Project folder name and the titles found in the project files.
 * @returns Display name.
 */
function resolveProjectDisplayName(options: {
    readonly projectDirectoryName: string;
    readonly readmeHeadingTitle: string | null;
    readonly indexHtmlTitle: string | null;
}): string {
    const readmeDisplayName = options.readmeHeadingTitle === null ? '' : stripMarkdownText(options.readmeHeadingTitle);
    const indexHtmlDisplayName = (options.indexHtmlTitle || '').trim();

    return readmeDisplayName || indexHtmlDisplayName || humanizeAgentProjectName(options.projectDirectoryName);
}

/**
 * Resolves a short project description from the first README paragraph.
 *
 * @param readmeContent - Full README content.
 * @param parsedSectionContent - Content of the first parsed markdown section.
 * @returns Plain-text description, truncated when needed.
 */
function resolveProjectDescription(readmeContent: string, parsedSectionContent: string): string {
    const contentForDescription = doesMarkdownStartWithHeading(readmeContent) ? parsedSectionContent : readmeContent;
    const firstParagraph = resolveFirstMarkdownParagraph(contentForDescription);

    if (!firstParagraph) {
        return '';
    }

    const description = stripMarkdownText(firstParagraph, {
        doubleNewlineReplacement: ' ',
        newlineReplacement: ' ',
    });

    return truncateProjectDescription(description);
}

/**
 * Returns whether markdown starts with an explicit heading.
 *
 * @param markdown - Markdown content to inspect.
 * @returns `true` when the first non-empty line is a heading.
 */
function doesMarkdownStartWithHeading(markdown: string): boolean {
    const firstNonEmptyLine = markdown
        .replace(/\r\n/g, '\n')
        .split('\n')
        .find((line) => line.trim().length > 0);

    return Boolean(firstNonEmptyLine?.trimStart().startsWith('#'));
}

/**
 * Finds the first paragraph-like markdown block.
 *
 * @param markdown - Markdown content to inspect.
 * @returns First paragraph block or an empty string.
 */
function resolveFirstMarkdownParagraph(markdown: string): string {
    return (
        markdown
            .replace(/\r\n/g, '\n')
            .split(/\n\s*\n/g)
            .map((block) => block.trim())
            .find(isMarkdownParagraphBlock) || ''
    );
}

/**
 * Returns whether one markdown block can be treated as a paragraph preview.
 *
 * @param block - Markdown block candidate.
 * @returns `true` for paragraph-like blocks.
 */
function isMarkdownParagraphBlock(block: string): boolean {
    if (!block) {
        return false;
    }

    const firstLine = block.split(/\r?\n/, 1)[0]?.trimStart() || '';
    if (!firstLine || firstLine.startsWith('#')) {
        return false;
    }

    if (MARKDOWN_CODE_FENCE_PREFIXES.some((fencePrefix) => firstLine.startsWith(fencePrefix))) {
        return false;
    }

    return !/^([-*_]){3,}$/.test(firstLine.trim());
}

/**
 * Truncates project descriptions to the shared display limit.
 *
 * @param description - Plain-text project description.
 * @returns Original or truncated description.
 */
function truncateProjectDescription(description: string): string {
    if (description.length <= PROJECT_DESCRIPTION_MAX_CHARACTERS) {
        return description;
    }

    return `${description.slice(0, PROJECT_DESCRIPTION_MAX_CHARACTERS).trimEnd()}...`;
}
