import { isRunningInNode } from '../../utils/isRunningInWhatever';
import { PromptbookLibrary } from '../PromptbookLibrary';

/**
 * Constructs Promptbook from given directory
 *
 * Note: Works only in Node.js environment because it reads the file system
 * Note: The function does NOT return promise it returns the library directly which dynamically loads promptbooks when needed
 *       SO during the construction syntax and logic sources IS NOT validated
 *
 * @returns PromptbookLibrary
 */
export function createPromptbookLibraryFromDirectory(): PromptbookLibrary {
    if (!isRunningInNode()) {
        throw new Error(
            'Function `createPromptbookLibraryFromDirectory` can only be run in Node.js environment because it reads the file system.',
        );
    }

    throw new Error('Not implemented yet');

    // TODO: !! Load dynamically DO NOT use createPromptbookLibraryFromPromise

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return null as any;
}

/***
 * TODO: [🍓][🚯] !!! Add to README and samples + maybe make `@promptbook/library` package
 */
