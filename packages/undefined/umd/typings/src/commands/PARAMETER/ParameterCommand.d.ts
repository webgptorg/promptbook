import type { string_markdown_text } from '../../types/typeAliases';
import type { string_name } from '../../types/typeAliases';
/**
 * Parsed PARAMETER command
 *
 * @see ./parameterCommandParser.ts for more details
 * @private within the commands folder
 */
export type ParameterCommand = {
    readonly type: 'PARAMETER';
    readonly isInput: boolean;
    readonly isOutput: boolean;
    readonly parameterName: string_name;
    readonly parameterDescription: string_markdown_text | null;
};
