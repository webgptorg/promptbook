import { createStandaloneBookLanguageMarkdown } from '../../../../../src/book-2.0/book-language-documentation/createStandaloneBookLanguageMarkdown';
import { NextResponse } from 'next/server';
import { resolveServerLanguageCode, type ServerLanguageCode } from '../../languages/ServerLanguageRegistry';
import { getBakedBookLanguageDocumentationAgents } from './getBookLanguageDocumentationAgents';

/**
 * Response headers for standalone Book language markdown docs.
 *
 * `no-store` is intentional so the route always serves the freshest generated
 * output from current source-of-truth definitions.
 */
export const BOOK_LANGUAGE_DOCUMENTATION_MARKDOWN_HEADERS = Object.freeze({
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
});

/**
 * Selection and language options shared by Markdown and PDF manual exports.
 */
export type BookLanguageDocumentationExportOptions = {
    /**
     * `null` includes all current server agents; an empty array includes none.
     */
    readonly selectedAgentIds: ReadonlyArray<string> | null;
    /**
     * Requested export language, used for response metadata and document language.
     */
    readonly language: ServerLanguageCode;
};

/**
 * Parses Book language manual export choices from a request URL.
 *
 * The absence of agent parameters means "all agents", matching the primary
 * export action. `agents=none` intentionally produces the portable manual
 * with no server-specific examples or prioritization.
 *
 * @param searchParams - URL parameters supplied to either export format.
 * @param defaultLanguage - Current request language used when none is selected explicitly.
 * @returns Validated manual export options.
 */
export function parseBookLanguageDocumentationExportOptions(
    searchParams: URLSearchParams,
    defaultLanguage: ServerLanguageCode,
): BookLanguageDocumentationExportOptions {
    const isNoAgentsSelected = searchParams.get('agents') === 'none';
    const selectedAgentIds = isNoAgentsSelected
        ? []
        : Array.from(new Set(searchParams.getAll('agent').filter((agentId) => agentId.trim().length > 0)));

    return {
        selectedAgentIds: isNoAgentsSelected || selectedAgentIds.length > 0 ? selectedAgentIds : null,
        language: resolveServerLanguageCode(searchParams.get('language') || defaultLanguage),
    };
}

/**
 * Creates one manual body from the selected current server agents.
 *
 * @param options - Agent selection and target language shared by all export formats.
 * @returns Generated Markdown plus language metadata used by HTTP and PDF responses.
 */
export async function createBookLanguageDocumentationExport(options: BookLanguageDocumentationExportOptions): Promise<{
    readonly language: ServerLanguageCode;
    readonly markdown: string;
}> {
    const bakedAgents = await getBakedBookLanguageDocumentationAgents(options.selectedAgentIds);

    return {
        language: options.language,
        markdown: createStandaloneBookLanguageMarkdown({
            agents: bakedAgents.map((agent) => ({
                agentName: agent.name,
                agentSource: agent.source,
            })),
        }),
    };
}

/**
 * Creates a Markdown response for standalone Book language documentation.
 *
 * @param options - Agent selection and language shared by all manual exports.
 * @returns HTTP response with generated Markdown and canonical headers.
 */
export async function createBookLanguageDocumentationMarkdownResponse(
    options: BookLanguageDocumentationExportOptions,
): Promise<NextResponse<string>> {
    const exportContent = await createBookLanguageDocumentationExport(options);

    return new NextResponse(exportContent.markdown, {
        headers: {
            ...BOOK_LANGUAGE_DOCUMENTATION_MARKDOWN_HEADERS,
            'Content-Language': exportContent.language,
        },
    });
}
