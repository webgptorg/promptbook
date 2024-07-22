import type { ModelRequirements } from '../../types/ModelRequirements';
import type { TODO } from '../../types/typeAliases';

/**
 * Parsed MODEL command
 *
 * @see ./modelCommandParser.ts for more details
 * @private within the commands folder
 */
export type ModelCommand = {
    readonly type: 'MODEL';
    readonly key: keyof ModelRequirements;
    readonly value: TODO /* <- TODO: Infer from used key, can it be done in TypeScript */;
};
