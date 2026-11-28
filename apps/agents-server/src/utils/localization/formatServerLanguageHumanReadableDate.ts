import moment from 'moment';
import type { ServerLanguageCode } from '../../languages/ServerLanguageRegistry';
import { createServerLanguageMoment } from './createServerLanguageMoment';

/**
 * Default fallback for missing date values.
 *
 * @private internal constant of `formatServerLanguageHumanReadableDate`
 */
const DEFAULT_FALLBACK_LABEL = 'N/A';

/**
 * Default localized exact-date format appended when requested.
 *
 * @private internal constant of `formatServerLanguageHumanReadableDate`
 */
const DEFAULT_EXACT_DATE_FORMAT = 'L LT';

/**
 * Options for localized human-readable date formatting.
 *
 * @private internal type of `formatServerLanguageHumanReadableDate`
 */
type FormatServerLanguageHumanReadableDateOptions = {
    /**
     * Text returned when the date value is empty.
     */
    readonly fallbackLabel?: string;

    /**
     * Whether to append the localized exact timestamp after the relative label.
     */
    readonly isExactDateIncluded?: boolean;
};

/**
 * Formats one timestamp for the active Agents Server language.
 *
 * @param value - Date-like value, usually an ISO timestamp from the database.
 * @param language - Active Agents Server language code.
 * @param options - Formatting options.
 * @returns Localized relative date label, with optional exact timestamp.
 * @private internal utility for Agents Server UI.
 */
export function formatServerLanguageHumanReadableDate(
    value: moment.MomentInput | null | undefined,
    language: ServerLanguageCode,
    options: FormatServerLanguageHumanReadableDateOptions = {},
): string {
    const fallbackLabel = options.fallbackLabel ?? DEFAULT_FALLBACK_LABEL;

    if (value === null || value === undefined || value === '') {
        return fallbackLabel;
    }

    const localizedMoment =
        typeof value === 'string'
            ? moment(value, moment.ISO_8601, true).locale(language)
            : createServerLanguageMoment(value, language);
    if (!localizedMoment.isValid()) {
        return typeof value === 'string' ? value : fallbackLabel;
    }

    const relativeLabel = localizedMoment.fromNow();
    if (!options.isExactDateIncluded) {
        return relativeLabel;
    }

    return `${relativeLabel} (${localizedMoment.format(DEFAULT_EXACT_DATE_FORMAT)})`;
}
