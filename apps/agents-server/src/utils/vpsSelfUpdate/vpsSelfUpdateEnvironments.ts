/**
 * Default upstream repository URL used when no custom origin is configured.
 */
export const VPS_SELF_UPDATE_DEFAULT_ORIGIN_REPOSITORY_URL = 'https://github.com/webgptorg/promptbook.git';

/**
 * Identifier of the synthetic environment that allows targeting an arbitrary git ref.
 */
export const VPS_SELF_UPDATE_CUSTOM_ENVIRONMENT_ID = 'custom' as const;

/**
 * Supported standalone VPS update environments.
 *
 * Order matters: it is the order presented to the super-admin in the UI.
 */
export const VPS_SELF_UPDATE_ENVIRONMENTS = [
    {
        id: 'main',
        branch: 'main',
        label: 'Live',
        description: 'Tracks the latest commit from the main development branch.',
        isCustom: false,
    },
    {
        id: 'preview',
        branch: 'preview',
        label: 'Preview',
        description: 'Follows the preview branch before changes reach production.',
        isCustom: false,
    },
    {
        id: 'production',
        branch: 'production',
        label: 'Production',
        description: 'Recommended stable deployment branch for standalone servers.',
        isCustom: false,
    },
    {
        id: 'lts',
        branch: 'lts',
        label: 'LTS',
        description: 'Keeps the server on the long-term-support branch.',
        isCustom: false,
    },
    {
        id: VPS_SELF_UPDATE_CUSTOM_ENVIRONMENT_ID,
        branch: '',
        label: 'Custom',
        description: 'Pick an arbitrary commit, tag, or branch — advanced and potentially unstable.',
        isCustom: true,
    },
] as const;

/**
 * Allowed standalone VPS update environment id.
 */
export type VpsSelfUpdateEnvironmentId = (typeof VPS_SELF_UPDATE_ENVIRONMENTS)[number]['id'];

/**
 * One environment option returned to the browser.
 */
export type VpsSelfUpdateEnvironmentOption = (typeof VPS_SELF_UPDATE_ENVIRONMENTS)[number];

/**
 * Resolves one environment id or branch name to the canonical environment object.
 *
 * Unknown values fall back to the production environment to preserve the historical default.
 *
 * @param value - Raw environment id, branch name, or label.
 * @returns Canonical environment metadata.
 */
export function resolveVpsSelfUpdateEnvironment(value: string | null | undefined): VpsSelfUpdateEnvironmentOption {
    const normalizedValue = value?.trim().toLowerCase() || 'production';
    return (
        VPS_SELF_UPDATE_ENVIRONMENTS.find(
            (environment) =>
                !environment.isCustom &&
                (environment.id === normalizedValue || environment.branch === normalizedValue),
        ) ?? getDefaultVpsSelfUpdateEnvironment()
    );
}

/**
 * Returns the canonical production environment used as the default fallback.
 *
 * @returns Production environment option.
 */
export function getDefaultVpsSelfUpdateEnvironment(): VpsSelfUpdateEnvironmentOption {
    const productionEnvironment = VPS_SELF_UPDATE_ENVIRONMENTS.find((environment) => environment.id === 'production');
    if (!productionEnvironment) {
        throw new Error('Production environment is missing from VPS_SELF_UPDATE_ENVIRONMENTS.');
    }
    return productionEnvironment;
}

/**
 * Returns the canonical custom environment option.
 *
 * @returns Custom environment metadata.
 */
export function getCustomVpsSelfUpdateEnvironment(): VpsSelfUpdateEnvironmentOption {
    const customEnvironment = VPS_SELF_UPDATE_ENVIRONMENTS.find(
        (environment) => environment.id === VPS_SELF_UPDATE_CUSTOM_ENVIRONMENT_ID,
    );
    if (!customEnvironment) {
        throw new Error('Custom environment is missing from VPS_SELF_UPDATE_ENVIRONMENTS.');
    }
    return customEnvironment;
}
