import type { ForeachJson } from "./ForeachJson";

/**
 * Parsed FOREACH command which is used to iterate over a table of values
 *
 * @see ./foreachCommandParser.ts for more details
 * @public exported from `@promptbook/editable`
 */
export type ForeachCommand = {
	readonly type: "FOREACH";
} & ForeachJson;
