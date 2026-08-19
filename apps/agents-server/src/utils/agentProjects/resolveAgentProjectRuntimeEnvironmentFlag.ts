/**
 * Values accepted as an enabled on/off environment flag.
 */
const ENABLED_ENVIRONMENT_FLAG_VALUES = ['1', 'true', 'yes', 'y'];

/**
 * Reads one optional on/off environment flag used by the agent project runtime managers.
 *
 * An unset (or empty) variable is reported as `null` instead of `false`, so every caller keeps
 * ownership of its own default while the accepted spellings of "enabled" stay defined in one place.
 *
 * @param environmentVariableName - Name of the environment variable to read.
 * @returns `true` or `false` when the variable is set, `null` when it is not.
 */
export function resolveAgentProjectRuntimeEnvironmentFlag(environmentVariableName: string): boolean | null {
    const configuredValue = process.env[environmentVariableName]?.trim().toLowerCase();

    if (!configuredValue) {
        return null;
    }

    return ENABLED_ENVIRONMENT_FLAG_VALUES.includes(configuredValue);
}
