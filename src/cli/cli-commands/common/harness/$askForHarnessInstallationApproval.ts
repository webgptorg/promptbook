import colors from 'colors';
import { createInterface } from 'readline';

/**
 * Asks the user in the terminal whether the harness should be installed or updated right now.
 *
 * Note: `$` is used to indicate that this function is not a pure function - it reads the answer from stdin
 *
 * @returns `true` when the user confirms, `false` when the user declines or the terminal is not interactive
 * @private internal utility of `promptbookCli`
 */
export async function $askForHarnessInstallationApproval(question: string): Promise<boolean> {
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

// Note: [🟡] Code for CLI harness installation approval [$askForHarnessInstallationApproval](src/cli/cli-commands/common/harness/$askForHarnessInstallationApproval.ts) should never be published outside of `@promptbook/cli`
