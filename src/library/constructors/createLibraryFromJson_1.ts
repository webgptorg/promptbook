import type { PromptbookJson } from '../../types/PromptbookJson/PromptbookJson';
import { SimplePromptbookLibrary } from '../SimplePromptbookLibrary';

/**
 * Creates PromptbookLibrary from array of PromptbookJson or PromptbookString
 *
 * Note: During the construction syntax and logic of all sources are validated
 *
 * @param promptbookSources
 * @returns PromptbookLibrary
 */
export async function createLibraryFromJson(...promptbooks: Array<PromptbookJson>): Promise<SimplePromptbookLibrary> {
    return new SimplePromptbookLibrary(...promptbooks);
}
