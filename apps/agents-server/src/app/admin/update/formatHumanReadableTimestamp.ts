import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { formatServerLanguageHumanReadableDate } from '../../../utils/localization/formatServerLanguageHumanReadableDate';

/**
 * Formats optional timestamps for the update status cards using `moment.js` with the active UI language.
 *
 * @param value - ISO timestamp or `null`.
 * @param language - Active UI language code.
 * @returns Localized human-friendly timestamp or fallback text.
 *
 * @private function of `<UpdateClient/>`
 */
export function formatHumanReadableTimestamp(value: string | null | undefined, language: ServerLanguageCode): string {
    return formatServerLanguageHumanReadableDate(value, language, {
        fallbackLabel: 'Not available',
        isExactDateIncluded: true,
    });
}
