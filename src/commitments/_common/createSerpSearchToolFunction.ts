import { spaceTrim } from 'spacetrim';
import { string_javascript_name } from '../../_packages/types.index';
import type { ToolFunction } from '../../scripting/javascript/JavascriptExecutionToolsOptions';
import { SerpSearchEngine } from '../../search-engines/serp/SerpSearchEngine';

/**
 * Creates one SERP-backed tool function used as a local fallback for search-like commitments.
 *
 * @param toolName - Technical tool name used for validation messages.
 * @param resultLabel - Human-readable label used in formatted results.
 * @returns Async tool function compatible with commitment tool registration.
 *
 * @private internal helper for search-like commitments
 */
export function createSerpSearchToolFunction(toolName: string_javascript_name, resultLabel: string): ToolFunction {
    return async (rawArgs: Record<string, unknown>): Promise<string> => {
        const { query, ...searchOptions } = rawArgs;

        if (typeof query !== 'string' || !query.trim()) {
            throw new Error(`${toolName} query is required`);
        }

        const searchEngine = new SerpSearchEngine();
        const results = await searchEngine.search(query, searchOptions);

        return spaceTrim(
            (block) => `
                ${resultLabel} results for "${query}"${
                Object.keys(searchOptions).length === 0 ? '' : ` with options ${JSON.stringify(searchOptions)}`
            }:

                ${block(
                    results
                        .map((result) =>
                            spaceTrim(`
                                - **${result.title}**
                                  ${result.url}
                                  ${result.snippet}
                            `),
                        )
                        .join('\n\n'),
                )}
            `,
        );
    };
}
