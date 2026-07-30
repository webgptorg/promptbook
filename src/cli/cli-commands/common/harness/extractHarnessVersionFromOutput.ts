/**
 * Pattern matching one `major.minor.patch` version anywhere in the output of a harness version command.
 */
const HARNESS_VERSION_PATTERN = /\b(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/u;

/**
 * Extracts the version from the raw output of a harness `--version` command.
 *
 * Harness CLIs print their version in many shapes, for example `2.1.199 (Claude Code)`,
 * `codex-cli 0.144.4`, `GitHub Copilot CLI 1.0.61.` or after unrelated deprecation warning lines,
 * so the first version-looking token of the first matching line wins.
 *
 * @returns The parsed version or `null` when the output contains no version
 * @private internal utility of `promptbookCli`
 */
export function extractHarnessVersionFromOutput(output: string): string | null {
    for (const line of output.split('\n')) {
        const versionMatch = HARNESS_VERSION_PATTERN.exec(line);

        if (versionMatch !== null) {
            return versionMatch[1] ?? null;
        }
    }

    return null;
}

// Note: [🟡] Code for CLI harness version parsing [extractHarnessVersionFromOutput](src/cli/cli-commands/common/harness/extractHarnessVersionFromOutput.ts) should never be published outside of `@promptbook/cli`
