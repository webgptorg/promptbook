import { NEWLINE, SPACE } from "./block-constants";

/**
 * Escapes block content to protect newline and space characters
 */
export function protectBlockContent(blockContent: string): string {
    return blockContent
        .split('\n')
        .join(NEWLINE)
        .split(' ')
        .join(SPACE);
}
