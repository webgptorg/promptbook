import spaceTrim from 'spacetrim';
import type { string_markdown } from '../../types/typeAliases';
import type { PromptResultUsage } from '../PromptResultUsage';
import type { UncertainNumber } from '../UncertainNumber';
import { usageToWorktime } from './usageToWorktime';

/**
 * Function `usageToHuman` will take usage and convert it to human readable report
 * 
 * @public exported from `@promptbook/core`
 */
export function usageToHuman(usage: PromptResultUsage): string_markdown {
 
    let report = 'Usage:';

    const uncertainNumberToHuman = ({ value, isUncertain }: UncertainNumber) =>
        `${isUncertain ? 'approximately ' : ''}${Math.round(value * 100) / 100}`;

    report += '\n' + `- Cost ${uncertainNumberToHuman(usage.price)} USD`;
    report += '\n' + `- Saved ${uncertainNumberToHuman(usageToWorktime(usage))} hours of human time`;

    return spaceTrim(report);
}

/**
 * TODO: Use "$1" not "1 USD"
 * TODO: Use markdown formatting like "Cost approximately **$1**"
 * TODO: Report in minutes, seconds, days NOT 0.1 hours
 * TODO: [🧠] Maybe make from `uncertainNumberToHuman` separate exported utility
 * TODO: When negligible usage, report "Negligible" or just don't report it
 * TODO: [🧠] Maybe use "~" instead of "approximately"
 * TODO: [🏛] Maybe make some markdown builder
 */
