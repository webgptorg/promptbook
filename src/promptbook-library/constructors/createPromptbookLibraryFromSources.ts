import { promptbookStringToJson } from '../../conversion/promptbookStringToJson';
import type { PromptbookJson } from '../../types/PromptbookJson/PromptbookJson';
import type { PromptbookString } from '../../types/PromptbookString';
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
export async function createPromptbookLibraryFromSources(
    ...promptbookSources: Array<PromptbookJson | PromptbookString>
): Promise<SimplePromptbookLibrary> {
    const promptbooks = new Array<PromptbookJson>();
    for (const source of promptbookSources) {
        let promptbook: PromptbookJson;

        if (typeof source === 'string') {
            // Note: When directly creating from string, no need to validate the source
            //       The validation is performed always before execution

            promptbook = await promptbookStringToJson(source);
        } else {
            promptbook = source;
        }

        promptbooks.push(promptbook);
    }
    return new SimplePromptbookLibrary(...promptbooks);
}
