import colors from 'colors';
import type { PromptRunnerHarnessName } from '../common/promptRunnerCliOptions';
import { $askForConfirmation } from '../common/$askForConfirmation';
import { getHarnessDefinition } from '../common/harness/HarnessDefinition';
import { ensureCoderGitignoreRules, getMissingCoderHarnessGitignoreRules } from './ensureCoderGitignoreFile';

/**
 * Offers to add missing project-local ignore rules for the selected coding harness.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it may ask the user and update `.gitignore`.
 *
 * @private internal utility of `ptbk coder`
 */
export async function $ensureCoderHarnessGitignoreRules(
    projectPath: string,
    harnessName: PromptRunnerHarnessName | undefined,
): Promise<void> {
    if (harnessName === undefined) {
        return;
    }

    const missingRules = await getMissingCoderHarnessGitignoreRules(projectPath, [harnessName]);

    if (missingRules.length === 0) {
        return;
    }

    const { label } = getHarnessDefinition(harnessName);
    const formattedRules = formatGitignoreRules(missingRules);
    const entryLabel = missingRules.length === 1 ? 'entry' : 'entries';
    const isAdditionApproved = await $askForConfirmation(
        `Add the missing ${label} ignore ${entryLabel} ${formattedRules} to \`.gitignore\` now?`,
    );

    if (!isAdditionApproved) {
        console.info(colors.gray(`Skipped, add ${formattedRules} to \`.gitignore\` manually.`));
        return;
    }

    await ensureCoderGitignoreRules(projectPath, missingRules);
    console.info(colors.gray(`✔ Added ${formattedRules} to \`.gitignore\`.`));
}

/**
 * Formats one or more `.gitignore` rules for a terminal confirmation message.
 */
function formatGitignoreRules(rules: ReadonlyArray<string>): string {
    return rules.map((rule) => `\`${rule}\``).join(', ');
}

// Note: [🟡] Code for coder harness gitignore prompts [$ensureCoderHarnessGitignoreRules](src/cli/cli-commands/coder/$ensureCoderHarnessGitignoreRules.ts) should never be published outside of `@promptbook/cli`
