import { PromptbookJson, PromptbookString } from '../../_packages/types.index';
import { promptbookStringToJson } from '../../conversion/promptbookStringToJson';
import { SimplePromptbookLibrary } from '../SimplePromptbookLibrary';

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

/**
 * Constructs Promptbook from any sources
 *
 * Note: During the construction syntax and logic of all sources are validated
 * Note: You can combine .ptbk.md and .ptbk.json files BUT it is not recommended
 *
 * @param promptbookSources contents of .ptbk.md or .ptbk.json files
 * @param settings settings for creating executor functions
 * @returns PromptbookLibrary
 */

/***
 * TODO: !!! Annotate all + all to README and samples
 */
