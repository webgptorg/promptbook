import type { PromptbookFetch } from "../../execution/PromptbookFetch";
import type { string_name } from "../../types/typeAliases";
import { TODO_USE } from "../../utils/organization/TODO_USE";

/**
 * @private still in development
 */
export async function isDomainNameFree(
	name: string_name,
	fetch: PromptbookFetch,
): Promise<boolean> {
	TODO_USE(name);
	TODO_USE(fetch);
	return false;
}

/**
 * TODO: [🍓][🧠] Test and implement `isDomainNameFree`
 * TODO: Export via some (and probably new) NPM package
 */
