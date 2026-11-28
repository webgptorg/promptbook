import { $askForConfirmation } from '../$askForConfirmation';
import type { NormalizedQuestionsCliOptions } from '../questionsCliOptions';

/**
 * Asks the user in the terminal whether an npm package should be installed or updated now.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it reads the answer from stdin
 *
 * @returns `true` when the user confirms, `false` when the user declines, the terminal is not interactive
 *          or the questions are disabled by `--no-questions`
 * @private internal utility of `promptbookCli`
 */
export async function $askForNpmPackageInstallationApproval(
    question: string,
    questionsOptions: NormalizedQuestionsCliOptions,
): Promise<boolean> {
    return $askForConfirmation(question, questionsOptions);
}

// Note: [🟡] Code for CLI npm package installation approval [$askForNpmPackageInstallationApproval](src/cli/cli-commands/common/npm/$askForNpmPackageInstallationApproval.ts) should never be published outside of `@promptbook/cli`
