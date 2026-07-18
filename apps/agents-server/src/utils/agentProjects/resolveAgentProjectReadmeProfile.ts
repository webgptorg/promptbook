import { parseMarkdownSection, splitMarkdownIntoSections } from '@promptbook-local/markdown-utils';
import type { string_markdown } from '@promptbook-local/types';
import { stripMarkdownText } from '../stripMarkdownText';
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
 * Project profile values resolved from a project folder and optional README.
 */
export type AgentProjectReadmeProfile = {
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
 * Resolves display metadata for one agent project from its README.
 *
 * @param options - Project folder name and optional README content.
 * @returns Project display profile.
 */
export function resolveAgentProjectReadmeProfile(options: {
    readonly projectDirectoryName: string;
    readonly readme: AgentProjectReadme | null;
}): AgentProjectReadmeProfile {
    const { projectDirectoryName, readme } = options;
    if (!readme) {
        return {
            displayName: projectDirectoryName,
            description: '',
            readmeFileName: null,
        };
    }

    const sections = parseMarkdownProfileSections(readme.content);
    const displayName = resolveProjectDisplayName(
        projectDirectoryName,
        sections.firstExplicitHeadingSection?.title ?? null,
    );
    const description = resolveProjectDescription(readme.content, sections.firstSection?.content ?? readme.content);

    return {
        displayName,
        description,
        readmeFileName: readme.fileName,
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
 * Resolves a project display name from the README heading or folder fallback.
 *
 * @param projectDirectoryName - Project folder name.
 * @param parsedHeadingTitle - Title returned by the markdown section parser.
 * @returns Display name.
 */
function resolveProjectDisplayName(projectDirectoryName: string, parsedHeadingTitle: string | null): string {
    if (!parsedHeadingTitle) {
        return projectDirectoryName;
    }

    const displayName = stripMarkdownText(parsedHeadingTitle);
    return displayName || projectDirectoryName;
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
