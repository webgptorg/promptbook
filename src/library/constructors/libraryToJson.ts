import type { PromptbookJson } from '../../types/PromptbookJson/PromptbookJson';
import type { PromptbookLibrary } from '../PromptbookLibrary';

/**
 * Converts PromptbookLibrary to serialized JSON
 *
 * Note: Functions `libraryToJson` and `createLibraryFromJson` are complementary
 */
export async function libraryToJson(library: PromptbookLibrary): Promise<Array<PromptbookJson>> {
    const promptbookUrls = await library.listPromptbooks();
    const promptbooks = await Promise.all(promptbookUrls.map((url) => library.getPromptbookByUrl(url)));
    return promptbooks;
}
