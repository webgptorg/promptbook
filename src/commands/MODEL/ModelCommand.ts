import type { ModelRequirements } from "../../types/ModelRequirements";
import type { TODO_any } from "../../utils/organization/TODO_any";

/**
 * Parsed MODEL command
 *
 * @see ./modelCommandParser.ts for more details
 * @deprecated Option to manually set the model requirements is not recommended to use, use `PERSONA` instead
 * @public exported from `@promptbook/editable`
 */
export type ModelCommand = {
	readonly type: "MODEL";
	readonly key: keyof ModelRequirements;
	readonly value: TODO_any /* <- TODO: Infer from used key, can it be done in TypeScript */;
};
