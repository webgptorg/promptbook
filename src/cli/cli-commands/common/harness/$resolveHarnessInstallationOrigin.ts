import { $resolveNpmGlobalPrefixPath } from '../npm/$resolveNpmGlobalPrefixPath';
import { $resolveHarnessCommandPath } from './$resolveHarnessCommandPath';
import type { HarnessDefinition } from './HarnessDefinition';
import type { HarnessInstallationOrigin } from './HarnessInstallationOrigin';
import { UNKNOWN_HARNESS_INSTALLATION_ORIGIN } from './HarnessInstallationOrigin';
import { resolveHarnessInstallationMethodFromPaths } from './resolveHarnessInstallationMethodFromPaths';

/**
 * Finds out where one CLI coding harness is really installed and which tool manages it.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it runs shell commands
 *
 * @private internal utility of `promptbookCli`
 */
export async function $resolveHarnessInstallationOrigin(
    definition: HarnessDefinition,
): Promise<HarnessInstallationOrigin> {
    const commandPath = await $resolveHarnessCommandPath(definition);

    if (commandPath === null) {
        return UNKNOWN_HARNESS_INSTALLATION_ORIGIN;
    }

    const npmGlobalPrefixPath = await $resolveNpmGlobalPrefixPath();

    return {
        commandPath,
        installationMethod: resolveHarnessInstallationMethodFromPaths({
            definition,
            commandPath,
            npmGlobalPrefixPath,
        }),
    };
}

// Note: [🟡] Code for CLI harness installation origin detection [$resolveHarnessInstallationOrigin](src/cli/cli-commands/common/harness/$resolveHarnessInstallationOrigin.ts) should never be published outside of `@promptbook/cli`
