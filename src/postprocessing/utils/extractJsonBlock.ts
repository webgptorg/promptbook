import { extractAllBlocksFromMarkdown } from '../../utils/markdown/extractAllBlocksFromMarkdown';
import { isValidJsonString } from '../../formats/json/utils/isValidJsonString';
import type { string_json } from '../../types/typeAliases';
import type { string_markdown } from '../../types/typeAliases';
import type { really_unknown } from '../../utils/organization/really_unknown';

/**
 * Extracts  extracts exactly one valid JSON code block
 *
 * - When given string is a valid JSON as it is, it just returns it
 * - When there is no JSON code block the function throws a `ParsingError`
 * - When there are multiple JSON code blocks the function throws a `ParsingError`
 *
 * Note: It is not important if marked as ```json BUT if it is VALID JSON
 * Note: There are multiple simmilar function:
 * - `extractBlock` just extracts the content of the code block which is also used as build-in function for postprocessing
 * - `extractJsonBlock` extracts exactly one valid JSON code block
 * - `extractOneBlockFromMarkdown` extracts exactly one code block with language of the code block
 * - `extractAllBlocksFromMarkdown` extracts all code blocks with language of the code block
 *
 * @public exported from `@promptbook/markdown-utils`
 * @throws {ParsingError} if there is no valid JSON block in the markdown
 */
export function extractJsonBlock(markdown: string_markdown): string_json<really_unknown> {
    if (isValidJsonString(markdown)) {
        return markdown as string_json<really_unknown>;
    }

    const codeBlocks = extractAllBlocksFromMarkdown(markdown);

    const jsonBlocks = codeBlocks.filter(
        ({ content }) => isValidJsonString(content),
        //                 <- Note: It is not important if marked as JSON `language === 'json'` BUT if it is VALID JSON
    );

    if (jsonBlocks.length === 0) {
        throw new Error('There is no valid JSON block in the markdown');
    }

    if (jsonBlocks.length > 1) {
        throw new Error('There are multiple JSON code blocks in the markdown');
    }

    return jsonBlocks[0]!.content as string_json<really_unknown>;
}

/**
 * TODO: Add some auto-healing logic + extract YAML, JSON5, TOML, etc.
 * TODO: [🏢] Make this logic part of `JsonFormatDefinition` or `isValidJsonString`
 */
