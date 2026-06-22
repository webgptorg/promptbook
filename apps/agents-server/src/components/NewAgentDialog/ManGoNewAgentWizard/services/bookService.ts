import { validateBook } from '../../../../../../../src/book-2.0/agent-source/string_book';

/**
 * Boundary used by the imported Book language panel.
 *
 * The Agents Server draft is already Book language, so conversion means validating the
 * current editable source and returning it unchanged.
 *
 * @param input - Current Book editor content.
 * @returns Validated Book source and validation flag for the panel badge.
 */
export async function convertToBook(input: string): Promise<{ book: string; isValid: boolean }> {
    let isValid = true;
    try {
        validateBook(input);
    } catch {
        isValid = false;
    }

    return { book: input, isValid };
}
