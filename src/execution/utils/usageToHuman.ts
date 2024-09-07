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
    const reportItems: Array<string> = [];

    const uncertainNumberToHuman = ({ value, isUncertain }: UncertainNumber) =>
        `${isUncertain ? 'approximately ' : ''}${Math.round(value * 100) / 100}`;

    if (
        usage.price.value > 0.1
        // <- TODO: [🍓][🧞‍♂️][👩🏽‍🤝‍🧑🏻] Configure negligible value - default value to config + value to `UsageToHumanSettings`
    ) {
        reportItems.push(`Cost ${uncertainNumberToHuman(usage.price)} USD`);
    } else {
        reportItems.push(`Negligible cost`);
    }

    const worktime = usageToWorktime(usage);
    if (
        worktime.value > 0.5
        // <- TODO: [🍓][🧞‍♂️][👩🏽‍🤝‍🧑🏻]
    ) {
        reportItems.push(`Saved ${uncertainNumberToHuman(usageToWorktime(usage))} hours of human time`);
        // TODO: [🍓][🧞‍♂️] Show minutes, seconds, days NOT 0.1 hours
    }

    if (usage.output.charactersCount.value > 0) {
        reportItems.push(`Written ${uncertainNumberToHuman(usage.output.charactersCount)} characters`);
    }

    if (reportItems.length === 0) {
        // Note: For negligible usage, we report at least something
        reportItems.push('Negligible');
    }

    return spaceTrim(
        (block) => `
            Usage:
            ${block(reportItems.map((item) => `- ${item}`).join('\n'))}
        `,
    );
}

/**
 * TODO: [🍓][🧞‍♂️] Use "$1" not "1 USD"
 * TODO: [🍓][🧞‍♂️] Use markdown formatting like "Cost approximately **$1**"
 * TODO: [🍓][🧞‍♂️] Report in minutes, seconds, days NOT 0.1 hours
 * TODO: [🧠] Maybe make from `uncertainNumberToHuman` separate exported utility
 * TODO: [🧠] Maybe use "~" instead of "approximately"
 * TODO: [🏛] Maybe make some markdown builder
 */
