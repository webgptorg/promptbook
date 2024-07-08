import type { PipelineJson } from '../../types/PipelineJson/PipelineJson';
import type { PromptbookLibrary } from '../PromptbookLibrary';
import { SimplePromptbookLibrary } from '../SimplePromptbookLibrary';

/**
 * Creates PromptbookLibrary from array of PipelineJson or PipelineString
 *
 * Note: Functions `libraryToJson` and `createLibraryFromJson` are complementary
 * Note: During the construction syntax and logic of all sources are validated
 *
 * @param promptbookSources
 * @returns PromptbookLibrary
 */
export function createLibraryFromJson(...promptbooks: Array<PipelineJson>): PromptbookLibrary {
    return new SimplePromptbookLibrary(...promptbooks);
}
