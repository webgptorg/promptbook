import type { PromptRunnerHarnessName } from '../promptRunnerCliOptions';
import type { NormalizedQuestionsCliOptions } from '../questionsCliOptions';
import { $applyHarnessInstallationStatus } from './$applyHarnessInstallationStatus';
import { $checkHarnessInstallation } from './$checkHarnessInstallation';
import type { HarnessDefinition } from './HarnessDefinition';
import { getHarnessDefinition } from './HarnessDefinition';

/**
 * Checks that every given CLI coding harness is installed globally and, when the questions are enabled, up to date.
 * Offers to install missing harnesses and update outdated ones.
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
    questionsOptions: NormalizedQuestionsCliOptions,
): Promise<void> {
    const definitions = resolveCheckedHarnessDefinitions(harnessNames);

    if (definitions.length === 0) {
        return;
    }

    // Note: An outdated harness can be updated only after the user confirms it, so `--no-questions`
    //       skips the slower npm registry lookup entirely and only reports what is installed.
    const isHarnessUpdateCheckEnabled = questionsOptions.isAskingQuestionsEnabled;

    // Note: Detection of all harnesses runs in parallel, the questions have to be asked one by one
    const statuses = await Promise.all(
        definitions.map((definition) => $checkHarnessInstallation(definition, isHarnessUpdateCheckEnabled)),
    );

    for (const status of statuses) {
        await $applyHarnessInstallationStatus(status, questionsOptions);
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
