import type { $side_effect } from '../../../src/utils/organization/$side_effect';

/**
 * Git configuration key which lets Git read, write and delete files whose absolute path is longer than
 * the Windows `MAX_PATH` limit of 260 characters.
 *
 * The key is only interpreted by Git for Windows, every other platform silently ignores it.
 */
const GIT_LONG_PATHS_CONFIGURATION_KEY = 'core.longpaths';

/**
 * Value which enables `core.longpaths`.
 */
const GIT_LONG_PATHS_CONFIGURATION_VALUE = 'true';

/**
 * Environment variable holding how many `GIT_CONFIG_KEY_<index>` / `GIT_CONFIG_VALUE_<index>` pairs Git reads.
 */
const GIT_CONFIGURATION_COUNT_VARIABLE_NAME = 'GIT_CONFIG_COUNT';

/**
 * Prefix of the environment variable holding the name of one environment-provided Git configuration entry.
 */
const GIT_CONFIGURATION_KEY_VARIABLE_PREFIX = 'GIT_CONFIG_KEY_';

/**
 * Prefix of the environment variable holding the value of one environment-provided Git configuration entry.
 */
const GIT_CONFIGURATION_VALUE_VARIABLE_PREFIX = 'GIT_CONFIG_VALUE_';

/**
 * Builds the environment variables which add `core.longpaths=true` to every Git process started with them.
 *
 * Git configuration passed through `GIT_CONFIG_COUNT` is inherited by child processes, so one single
 * environment covers the Git commands of the coder, of the coding agent and of the verification command alike.
 *
 * Returns an empty record when the given environment already configures `core.longpaths`, which keeps an
 * explicit user setting untouched and keeps repeated calls from stacking duplicate entries.
 */
export function buildGitLongPathsEnvironmentVariables(
    baseEnvironment: Readonly<Record<string, string | undefined>>,
): Record<string, string> {
    const configurationCount = parseGitConfigurationCount(baseEnvironment[GIT_CONFIGURATION_COUNT_VARIABLE_NAME]);

    for (let configurationIndex = 0; configurationIndex < configurationCount; configurationIndex++) {
        if (
            baseEnvironment[`${GIT_CONFIGURATION_KEY_VARIABLE_PREFIX}${configurationIndex}`] ===
            GIT_LONG_PATHS_CONFIGURATION_KEY
        ) {
            return {};
        }
    }

    return {
        [GIT_CONFIGURATION_COUNT_VARIABLE_NAME]: String(configurationCount + 1),
        [`${GIT_CONFIGURATION_KEY_VARIABLE_PREFIX}${configurationCount}`]: GIT_LONG_PATHS_CONFIGURATION_KEY,
        [`${GIT_CONFIGURATION_VALUE_VARIABLE_PREFIX}${configurationCount}`]: GIT_LONG_PATHS_CONFIGURATION_VALUE,
    };
}

/**
 * Enables Git long path support for every process started from the current one.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it mutates `process.env`
 */
export function $enableGitLongPathsSupport(): $side_effect {
    Object.assign(process.env, buildGitLongPathsEnvironmentVariables(process.env));
}

/**
 * Reads how many Git configuration entries the given environment already provides.
 *
 * Anything Git itself would reject is treated as no entry at all, so a broken value is replaced
 * instead of being extended into an even more broken one.
 */
function parseGitConfigurationCount(rawConfigurationCount: string | undefined): number {
    if (rawConfigurationCount === undefined || !/^\d+$/u.test(rawConfigurationCount.trim())) {
        return 0;
    }

    return Number.parseInt(rawConfigurationCount.trim(), 10);
}
