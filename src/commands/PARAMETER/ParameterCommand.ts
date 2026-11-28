import type { string_markdown_text } from '../../types/string_markdown';
import type { string_name } from '../../types/string_name';

/**
 * Parsed PARAMETER command
 *
 * @see ./parameterCommandParser.ts for more details
 *
 * @public exported from `@promptbook/editable`
 */
export type ParameterCommand = {
    readonly type: 'PARAMETER';
    readonly isInput: boolean;
    readonly isOutput: boolean;
    readonly parameterName: string_name;
    readonly parameterDescription: string_markdown_text | null;
};
