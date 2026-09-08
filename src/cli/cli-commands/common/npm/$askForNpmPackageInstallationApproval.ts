import { $askForConfirmation } from '../$askForConfirmation';

/**
 * Asks the user in the terminal whether an npm package should be installed or updated now.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it reads the answer from stdin
 *
 * @returns `true` when the user confirms, `false` when the user declines or the terminal is not interactive
 * @private internal utility of `promptbookCli`
 */
export async function $askForNpmPackageInstallationApproval(question: string): Promise<boolean> {
    return $askForConfirmation(question);
}

// Note: [🟡] Code for CLI npm package installation approval [$askForNpmPackageInstallationApproval](src/cli/cli-commands/common/npm/$askForNpmPackageInstallationApproval.ts) should never be published outside of `@promptbook/cli`
