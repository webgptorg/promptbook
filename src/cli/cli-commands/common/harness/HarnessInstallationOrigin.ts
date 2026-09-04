/**
 * Way in which the globally available harness command got onto the current machine.
 *
 * - `npm-global` the command comes from a global npm installation, so `npm install -g` really updates it
 * - `standalone` the command was installed by the own installer of the harness and updates itself in place
 * - `homebrew` the command is managed by Homebrew, so only `brew` may update it
 * - `unknown` the command lives somewhere else or could not be located at all
 *
 * @private internal utility of `promptbookCli`
 */
export type HarnessInstallationMethod = 'npm-global' | 'standalone' | 'homebrew' | 'unknown';

/**
 * Place where the harness command really lives together with the way it was installed there.
 *
 * Knowing the origin is what keeps an update from installing a **second** copy of a harness which is
 * managed outside of npm, for example the standalone installation of OpenAI Codex.
 *
 * @private internal utility of `promptbookCli`
 */
export type HarnessInstallationOrigin = {
    /**
     * Resolved path of the harness command with every symbolic link followed
     * or `null` when the command could not be located.
     */
    readonly commandPath: string | null;

    /**
     * Way in which the harness command was installed.
     */
    readonly installationMethod: HarnessInstallationMethod;
};

/**
 * Origin used when the harness command was not looked up at all, for example when the update check is disabled.
 *
 * @private internal utility of `promptbookCli`
 */
export const UNKNOWN_HARNESS_INSTALLATION_ORIGIN: HarnessInstallationOrigin = {
    commandPath: null,
    installationMethod: 'unknown',
};

// Note: [🟡] Code for CLI harness installation origin [HarnessInstallationOrigin](src/cli/cli-commands/common/harness/HarnessInstallationOrigin.ts) should never be published outside of `@promptbook/cli`
