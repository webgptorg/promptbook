import type { string_markdown } from '../../types/typeAliases';
import type { PromptResultUsage } from '../PromptResultUsage';
/**
 * Function `usageToHuman` will take usage and convert it to human readable report
 *
 * @public exported from `@promptbook/core`
 */
export declare function usageToHuman(usage: PromptResultUsage): string_markdown;
/**
 * TODO: Use "$1" not "1 USD"
 * TODO: Use markdown formatting like "Cost approximately **$1**"
 * TODO: Report in minutes, seconds, days NOT 0.1 hours
 * TODO: [🧠] Maybe make from `uncertainNumberToHuman` separate exported utility
 * TODO: When negligible usage, report "Negligible" or just don't report it
 * TODO: [🧠] Maybe use "~" instead of "approximately"
 * TODO: [🏛] Maybe make some markdown builder
 */
