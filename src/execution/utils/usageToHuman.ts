import spaceTrim from 'spacetrim';
import type { string_markdown } from '../../types/typeAliases';
import type { PromptResultUsage } from '../PromptResultUsage';
import { usageToWorktime } from './usageToWorktime';

/**
 * Function `usageToHuman` will take usage and convert it to human readable report
 */
export function usageToHuman(usage: PromptResultUsage): string_markdown {
    let report = 'Usage:';

    const price = usage.price;
    report += '\n' + `- Cost ${price.isUncertain ? 'approximately ' : ''} **$${price.value}**`;

    const worktime = usageToWorktime(usage);
    report +=
        '\n' + `- Saved ${worktime.isUncertain ? 'approximately ' : ''} **${worktime.value} hours** of human time`;

    report = report.split('  ').join(' ');

    return spaceTrim(report);
}

/**
 * TODO: [🏛] Maybe make some markdown builder
 */
