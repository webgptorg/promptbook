import { $execCommand } from '../../../../utils/execCommand/$execCommand';
import { extractNpmPackageVersionFromOutput } from '../npm/extractNpmPackageVersionFromOutput';
import type { HarnessDefinition } from './HarnessDefinition';

/**
 * Time limit for asking the globally installed harness command for its version.
 */
const HARNESS_VERSION_COMMAND_TIMEOUT_MS = 30 * 1000;

/**
 * Reads the version of the globally installed harness command.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it runs the harness command
 *
 * @returns The installed version or `null` when the harness command is not available globally
 * @private internal utility of `promptbookCli`
 */
export async function $resolveInstalledHarnessVersion(definition: HarnessDefinition): Promise<string | null> {
    const output = await $execCommand({
        command: `${definition.commandName} --version`,
        crashOnError: true,
        timeout: HARNESS_VERSION_COMMAND_TIMEOUT_MS,
        isVerbose: false,
    }).catch(() => '');

    return extractNpmPackageVersionFromOutput(output);
}

// Note: [🟡] Code for CLI harness version detection [$resolveInstalledHarnessVersion](src/cli/cli-commands/common/harness/$resolveInstalledHarnessVersion.ts) should never be published outside of `@promptbook/cli`
