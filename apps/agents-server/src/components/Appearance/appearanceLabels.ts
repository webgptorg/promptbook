import { APPEARANCE_PREFERENCES, type AppearancePreference, type ResolvedAppearance } from '../../constants/appearance';
import type { useServerLanguage } from '../ServerLanguage/ServerLanguageProvider';

/**
 * Shared translation helper type used by appearance label builders.
 */
type AppearanceTranslator = ReturnType<typeof useServerLanguage>['t'];

/**
 * Builds the localized appearance options shown in selects.
 *
 * @param translate - Active server-translation helper.
 * @returns Localized appearance options.
 * @private shared helper for appearance UI
 */
export function createAppearancePreferenceOptions(translate: AppearanceTranslator) {
    return [
        {
            value: APPEARANCE_PREFERENCES.SYSTEM,
            label: translate('appearance.optionSystem'),
        },
        {
            value: APPEARANCE_PREFERENCES.LIGHT,
            label: translate('appearance.optionLight'),
        },
        {
            value: APPEARANCE_PREFERENCES.DARK,
            label: translate('appearance.optionDark'),
        },
    ] satisfies ReadonlyArray<{
        readonly value: AppearancePreference;
        readonly label: string;
    }>;
}

/**
 * Resolves one localized appearance label for preference badges and helper text.
 *
 * @param translate - Active server-translation helper.
 * @param appearance - Stored preference or resolved light/dark appearance.
 * @returns Localized appearance label.
 * @private shared helper for appearance UI
 */
export function getAppearanceLabel(
    translate: AppearanceTranslator,
    appearance: AppearancePreference | ResolvedAppearance,
): string {
    switch (appearance) {
        case APPEARANCE_PREFERENCES.DARK:
            return translate('appearance.optionDark');
        case APPEARANCE_PREFERENCES.LIGHT:
            return translate('appearance.optionLight');
        default:
            return translate('appearance.optionSystem');
    }
}
