import type { ModelRequirements } from '../../types/ModelRequirements';

/**
 * Parsed MODEL command
 *
 * @see ./modelCommandParser.ts for more details
 * @private within the commands folder
 */
export type ModelCommand = {
    readonly type: 'MODEL';
    readonly key: keyof ModelRequirements;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly value: any /* <- TODO: Infer from used key, can it be done in TypeScript */;
};
