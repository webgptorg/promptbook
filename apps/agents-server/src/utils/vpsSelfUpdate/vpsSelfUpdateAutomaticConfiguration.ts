import { NotAllowed } from '../../../../../src/errors/NotAllowed';
import { spaceTrim } from 'spacetrim';
import { updateVpsEnvironmentVariables } from '../vpsConfiguration';
import { DEFAULT_VPS_SELF_UPDATE_CRON_EXPRESSION, normalizeVpsSelfUpdateCronExpression } from './vpsSelfUpdateCron';
import {
    resolveVpsSelfUpdateEnvironment,
    VPS_SELF_UPDATE_ENVIRONMENTS,
    type VpsSelfUpdateEnvironmentOption,
} from './vpsSelfUpdateEnvironment';
import type { VpsSelfUpdateAutomaticConfiguration } from './vpsSelfUpdateTypes';
import { readVpsSelfUpdateConfiguredEnvironmentValue } from './vpsSelfUpdateConfiguration';

/**
 * `.env` variable that toggles automatic standalone VPS self-updates.
 *
 * @private constant of `vpsSelfUpdate`
 */
export const VPS_SELF_UPDATE_AUTOMATIC_ENABLED_ENV_NAME = 'PTBK_AUTO_SELF_UPDATE_ENABLED';

/**
 * `.env` variable that stores the branch tracked by standalone VPS self-updates.
 *
 * @private constant of `vpsSelfUpdate`
 */
export const VPS_SELF_UPDATE_BRANCH_ENV_NAME = 'PROMPTBOOK_REPOSITORY_REF';

/**
 * `.env` variable that stores the automatic self-update cron expression.
 *
 * @private constant of `vpsSelfUpdate`
 */
export const VPS_SELF_UPDATE_AUTOMATIC_CRON_ENV_NAME = 'PTBK_AUTO_SELF_UPDATE_CRON';

/**
 * Payload accepted when saving the automatic self-update configuration.
 *
 * @private type of `vpsSelfUpdate`
 */
export type VpsSelfUpdateAutomaticConfigurationUpdate = {
    /**
     * Whether scheduled branch updates are enabled.
     */
    readonly isEnabled: boolean;
    /**
     * Environment id or branch to track.
     */
    readonly environmentId: string;
    /**
     * Cron expression controlling how often the scheduler checks the branch.
     */
    readonly cronExpression: string;
};

/**
 * Reads automatic self-update configuration from the standalone VPS `.env` file.
 *
 * @returns Browser-safe automatic self-update configuration.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function readVpsSelfUpdateAutomaticConfiguration(): Promise<VpsSelfUpdateAutomaticConfiguration> {
    const [rawEnabled, rawBranch, rawCronExpression] = await Promise.all([
        readVpsSelfUpdateConfiguredEnvironmentValue(VPS_SELF_UPDATE_AUTOMATIC_ENABLED_ENV_NAME),
        readVpsSelfUpdateConfiguredEnvironmentValue(VPS_SELF_UPDATE_BRANCH_ENV_NAME),
        readVpsSelfUpdateConfiguredEnvironmentValue(VPS_SELF_UPDATE_AUTOMATIC_CRON_ENV_NAME),
    ]);

    return {
        isEnabled: isVpsSelfUpdateAutomaticEnabled(rawEnabled),
        environment: resolveVpsSelfUpdateEnvironment(rawBranch),
        cronExpression: normalizeStoredVpsSelfUpdateCronExpression(rawCronExpression),
    };
}

/**
 * Saves automatic self-update configuration through the shared VPS `.env` writer.
 *
 * @param update - Raw configuration payload from `/admin/update`.
 * @returns Normalized automatic self-update configuration.
 *
 * @private function of `vpsSelfUpdate`
 */
export async function updateVpsSelfUpdateAutomaticConfiguration(
    update: VpsSelfUpdateAutomaticConfigurationUpdate,
): Promise<VpsSelfUpdateAutomaticConfiguration> {
    const environment = resolveStrictVpsSelfUpdateEnvironment(update.environmentId);
    const cronExpression = normalizeVpsSelfUpdateCronExpression(update.cronExpression);

    await updateVpsEnvironmentVariables({
        [VPS_SELF_UPDATE_AUTOMATIC_ENABLED_ENV_NAME]: update.isEnabled ? 'true' : 'false',
        [VPS_SELF_UPDATE_BRANCH_ENV_NAME]: environment.branch,
        [VPS_SELF_UPDATE_AUTOMATIC_CRON_ENV_NAME]: cronExpression,
    });

    return {
        isEnabled: update.isEnabled,
        environment,
        cronExpression,
    };
}

/**
 * Parses the automatic self-update boolean environment value.
 *
 * @param value - Raw `.env` value.
 * @returns `true` when automatic self-updates are explicitly enabled.
 */
function isVpsSelfUpdateAutomaticEnabled(value: string | null): boolean {
    const normalizedValue = value?.trim().toLowerCase() || '';
    return (
        normalizedValue === '1' || normalizedValue === 'true' || normalizedValue === 'yes' || normalizedValue === 'on'
    );
}

/**
 * Normalizes a stored cron expression, falling back to the default if a hand-edited value is invalid.
 *
 * @param value - Stored `.env` cron expression.
 * @returns Valid cron expression for scheduler and browser use.
 */
function normalizeStoredVpsSelfUpdateCronExpression(value: string | null): string {
    try {
        return normalizeVpsSelfUpdateCronExpression(value || DEFAULT_VPS_SELF_UPDATE_CRON_EXPRESSION);
    } catch {
        return DEFAULT_VPS_SELF_UPDATE_CRON_EXPRESSION;
    }
}

/**
 * Resolves and validates one branch environment selected by the admin.
 *
 * @param value - Environment id or branch.
 * @returns Supported non-custom self-update environment.
 */
function resolveStrictVpsSelfUpdateEnvironment(value: string): VpsSelfUpdateEnvironmentOption {
    const normalizedValue = value.trim().toLowerCase();
    const environment = VPS_SELF_UPDATE_ENVIRONMENTS.find(
        (option) => !option.isCustom && (option.id === normalizedValue || option.branch === normalizedValue),
    );

    if (!environment) {
        throw new NotAllowed(
            spaceTrim(`
                Automatic self-update branch \`${value}\` is not supported.

                **Use one of:** \`main\`, \`preview\`, \`production\`, or \`lts\`.
            `),
        );
    }

    return environment;
}
