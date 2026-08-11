import colors from 'colors';
import { createInterface } from 'readline';

/**
 * Asks the user in the terminal whether an npm package should be installed or updated now.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it reads the answer from stdin
 *
 * @returns `true` when the user confirms, `false` when the user declines or the terminal is not interactive
 * @private internal utility of `promptbookCli`
 */
export async function $askForNpmPackageInstallationApproval(question: string): Promise<boolean> {
    if (!process.stdin.isTTY) {
        // Note: In non-interactive environments like CI there is nobody who could confirm the installation
        return false;
    }

    const readlineInterface = createInterface({ input: process.stdin, output: process.stdout });

    try {
        const answer = await new Promise<string>((resolve) => {
            readlineInterface.question(colors.cyan(`${question} [y/N] `), resolve);
        });

        return ['y', 'yes'].includes(answer.trim().toLowerCase());
    } finally {
        readlineInterface.close();
    }
}

// Note: [🟡] Code for CLI npm package installation approval [$askForNpmPackageInstallationApproval](src/cli/cli-commands/common/npm/$askForNpmPackageInstallationApproval.ts) should never be published outside of `@promptbook/cli`
