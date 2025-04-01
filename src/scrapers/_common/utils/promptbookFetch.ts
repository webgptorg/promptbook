import spaceTrim from 'spacetrim';
import { PromptbookFetchError } from '../../../errors/PromptbookFetchError';
import type { PromptbookFetch } from '../../../execution/PromptbookFetch';
import type { string_url } from '../../../types/typeAliases';

/**
 * The built-in `fetch' function with a lightweight error handling wrapper as default fetch function used in Promptbook scrapers
 *
 * @public exported from `@promptbook/core`
 */
export const promptbookFetch: PromptbookFetch = async (
    urlOrRequest: string_url | Request,
    init?: RequestInit,
): Promise<Response> => {
    try {
        return await fetch(urlOrRequest, init);
    } catch (error) {
        if (!(error instanceof Error)) {
            throw error;
        }

        let url: string | undefined;

        if (typeof urlOrRequest === 'string') {
            url = urlOrRequest;
        } else if (urlOrRequest instanceof Request) {
            url = urlOrRequest.url;
        }

        throw new PromptbookFetchError(
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

/**
 * TODO: [🧠] Maybe rename because it is not used only for scrapers but also in `$getCompiledBook`
 */
