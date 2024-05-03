import { PromptbookJson, PromptbookString } from '../../_packages/types.index';
import { promptbookStringToJson } from '../../conversion/promptbookStringToJson';
import { SimplePromptbookLibrary } from '../SimplePromptbookLibrary';

/**
 * Creates PromptbookLibrary from array of PromptbookJson or PromptbookString
 *
 * Note: You can combine `PromptbookString` (`.ptbk.md`) with `PromptbookJson` BUT it is not recommended
 * Note: During the construction syntax and logic of all sources are validated
 *
 * @param promptbookSources
 * @returns PromptbookLibrary
 */
export function createPromptbookLibraryFromSources(
    ...promptbookSources: Array<PromptbookJson | PromptbookString>
): SimplePromptbookLibrary {
    const promptbooks = new Array<PromptbookJson>();
    for (const source of promptbookSources) {
        let promptbook: PromptbookJson;

        if (typeof source === 'string') {
            // Note: When directly creating from string, no need to validate the source
            //       The validation is performed always before execution

            promptbook = promptbookStringToJson(source);
        } else {
            promptbook = source;
        }

        promptbooks.push(promptbook);
    }
    return new SimplePromptbookLibrary(...promptbooks);
}

/***
 * TODO: [🍓][🚯] !!! Add to README and samples + maybe make `@promptbook/library` package
 */
