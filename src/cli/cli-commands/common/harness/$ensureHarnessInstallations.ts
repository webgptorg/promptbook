import type { PromptRunnerHarnessName } from '../promptRunnerCliOptions';
import { $applyHarnessInstallationStatus } from './$applyHarnessInstallationStatus';
import { $checkHarnessInstallation } from './$checkHarnessInstallation';
import type { HarnessDefinition } from './HarnessDefinition';
import { getHarnessDefinition } from './HarnessDefinition';

/**
 * Checks that every given CLI coding harness is installed globally and up to date and offers to
 * install or update the ones which are not.
 *
 * Harness names which are `undefined`, for example when no `--harness` is selected in a dry run,
 * are ignored so that every call site can pass its raw selection.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it may install npm packages
 *
 * @private internal utility of `promptbookCli`
 */
export async function $ensureHarnessInstallations(
    harnessNames: ReadonlyArray<PromptRunnerHarnessName | undefined>,
): Promise<void> {
    const definitions = resolveCheckedHarnessDefinitions(harnessNames);

    if (definitions.length === 0) {
        return;
    }

    // Note: Detection of all harnesses runs in parallel, the questions have to be asked one by one
    const statuses = await Promise.all(definitions.map((definition) => $checkHarnessInstallation(definition)));

    for (const status of statuses) {
        await $applyHarnessInstallationStatus(status);
    }
}

/**
 * Resolves the definitions of the harnesses which should be checked, without duplicates.
 */
function resolveCheckedHarnessDefinitions(
    harnessNames: ReadonlyArray<PromptRunnerHarnessName | undefined>,
): ReadonlyArray<HarnessDefinition> {
    const selectedHarnessNames = harnessNames.filter(
        (harnessName): harnessName is PromptRunnerHarnessName => harnessName !== undefined,
    );

    return Array.from(new Set(selectedHarnessNames)).map((harnessName) => getHarnessDefinition(harnessName));
}

// Note: [🟡] Code for CLI harness installation orchestration [$ensureHarnessInstallations](src/cli/cli-commands/common/harness/$ensureHarnessInstallations.ts) should never be published outside of `@promptbook/cli`
