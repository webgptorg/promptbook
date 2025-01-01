import spaceTrim from 'spacetrim';
import { KnowledgeScrapeError } from '../../../errors/KnowledgeScrapeError';
import { PromptbookFetch } from '../../../execution/PromptbookFetch';
import { string_url } from '../../../types/typeAliases';

/**
 * The built-in `fetch' function with a lightweight error handling wrapper as default fetch function used in Promptbook scrapers
 */
export const scraperFetch: PromptbookFetch = async (url: string_url, init?: RequestInit): Promise<Response> => {
    try {
        return await fetch(url, init);
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }

        throw new KnowledgeScrapeError(
            spaceTrim(
                (block) => `
                    Can not fetch "${url}"

                    Fetch error:
                    ${block((error as Error).message)}

                `,
            ),
        );
    }
};
