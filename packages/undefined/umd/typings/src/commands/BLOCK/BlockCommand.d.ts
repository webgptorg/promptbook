import type { BlockType } from './BlockTypes';
/**
 * Parsed BLOCK command
 *
 * @see ./blockCommandParser.ts for more details
 * @private within the commands folder
 */
export type BlockCommand = {
    readonly type: 'BLOCK';
    readonly blockType: BlockType;
};
