import type { ServerLanguageCode } from '../../../languages/ServerLanguageRegistry';
import { createServerLanguageMoment } from '../../../utils/localization/createServerLanguageMoment';
import type { UpdateOverview } from './UpdateOverview';

/**
 * Builds the localized time-behind portion of the deployment drift label (e.g. `3 days behind`).
 *
 * @param overview - Current overview snapshot.
 * @param language - Active UI language for moment localization.
 * @returns Time-behind label or empty string when either side of the comparison is missing.
 *
 * @private function of `<UpdateClient/>`
 */
export function buildDeploymentTimeBehindLabel(
    overview: UpdateOverview | null,
    language: ServerLanguageCode,
): string {
    if (!overview?.currentCommitDate || !overview.latestRemoteCommitDate) {
        return '';
    }

    const currentMoment = createServerLanguageMoment(overview.currentCommitDate, language);
    const latestMoment = createServerLanguageMoment(overview.latestRemoteCommitDate, language);
    if (!currentMoment.isValid() || !latestMoment.isValid()) {
        return '';
    }

    return `${currentMoment.from(latestMoment, true)} behind`;
}
