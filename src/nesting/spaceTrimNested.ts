import { protectBlockContent } from './protectBlockContent';
import { restoreBlockContent } from './restoreBlockContent';

/**
 * Trims whitespace from all 4 sides with nested substrings
 */
export function spaceTrimNested(
    createContent: (block: (blockContent: string) => string) => string,
): string;

export async function spaceTrimNested(
    createContent: (block: (blockContent: string) => string) => Promise<string>,
): Promise<string>;
export function spaceTrimNested(
    createContent: (
        block: (blockContent: string) => string,
    ) => string | Promise<string>,
): string | Promise<string> {
    const content = createContent(protectBlockContent);

    if (typeof content === 'string') {
        return restoreBlockContent(content);
    } else {
        return content.then(restoreBlockContent);
    }
}
