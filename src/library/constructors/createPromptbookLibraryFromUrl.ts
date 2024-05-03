import { PromptbookLibrary } from '../PromptbookLibrary';

/**
 * Constructs Promptbook from remote Promptbase URL
 *
 * Note: The function does NOT return promise it returns the library directly which dynamically loads promptbooks when needed
 *       SO during the construction syntax and logic sources IS NOT validated
 *
 * @returns PromptbookLibrary
 */
export function createPromptbookLibraryFromUrl(): PromptbookLibrary {
    throw new Error('Not implemented yet');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return null as any;

    // TODO: !! Load dynamically DO NOT use createPromptbookLibraryFromPromise
}

/***
 * TODO: [🍓][🚯] !!! Add to README and samples + maybe make `@promptbook/library` package
 */
