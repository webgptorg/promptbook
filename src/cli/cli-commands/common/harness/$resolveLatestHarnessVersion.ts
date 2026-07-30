import { $execCommand } from '../../../../utils/execCommand/$execCommand';
import { extractHarnessVersionFromOutput } from './extractHarnessVersionFromOutput';
import type { HarnessDefinition } from './HarnessDefinition';

/**
 * Time limit for the whole `npm view` lookup of the newest published harness version.
 */
const HARNESS_LATEST_VERSION_COMMAND_TIMEOUT_MS = 60 * 1000;

/**
 * Time limit for one npm registry request, so an unreachable registry never blocks the command.
 */
const NPM_REGISTRY_FETCH_TIMEOUT_MS = 20 * 1000;

/**
 * Reads the newest version of the harness published to npm.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it queries the npm registry
 *
 * @returns The newest published version or `null` when the registry could not be reached
 * @private internal utility of `promptbookCli`
 */
export async function $resolveLatestHarnessVersion(definition: HarnessDefinition): Promise<string | null> {
    const output = await $execCommand({
        command: `npm view ${definition.npmPackageName} version --fetch-timeout=${NPM_REGISTRY_FETCH_TIMEOUT_MS} --fetch-retries=1`,
        crashOnError: true,
        timeout: HARNESS_LATEST_VERSION_COMMAND_TIMEOUT_MS,
        isVerbose: false,
    }).catch(() => '');

    return extractHarnessVersionFromOutput(output);
}

// Note: [🟡] Code for CLI harness registry lookup [$resolveLatestHarnessVersion](src/cli/cli-commands/common/harness/$resolveLatestHarnessVersion.ts) should never be published outside of `@promptbook/cli`
