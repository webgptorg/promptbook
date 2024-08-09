import type { ModelRequirements } from '../../types/ModelRequirements';
import type { TODO_any } from '../../utils/organization/TODO_any';
/**
 * Parsed MODEL command
 *
 * @see ./modelCommandParser.ts for more details
 * @private within the commands folder
 */
export type ModelCommand = {
    readonly type: 'MODEL';
    readonly key: keyof ModelRequirements;
    readonly value: TODO_any;
};
