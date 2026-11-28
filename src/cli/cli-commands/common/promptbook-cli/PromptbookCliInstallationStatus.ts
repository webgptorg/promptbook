import type { PromptbookCliInstallation } from './PromptbookCliInstallation';

/**
 * Result of comparing one installed Promptbook CLI package with the newest published version.
 *
 * @private internal utility of `promptbookCli`
 */
export type PromptbookCliInstallationState = 'up-to-date' | 'outdated' | 'unknown';

/**
 * Version status of one Promptbook CLI installation.
 *
 * @private internal utility of `promptbookCli`
 */
export type PromptbookCliInstallationStatus = {
    /**
     * Installed CLI package being checked.
     */
    readonly installation: PromptbookCliInstallation;

    /**
     * Result of comparing the installed version with the newest published version.
     */
    readonly installationState: PromptbookCliInstallationState;

    /**
     * Newest published package version, or `null` when npm could not be reached.
     */
    readonly latestVersion: string | null;
};

// Note: [🟡] Code for Promptbook CLI installation status [PromptbookCliInstallationStatus](src/cli/cli-commands/common/promptbook-cli/PromptbookCliInstallationStatus.ts) should never be published outside of `@promptbook/cli`
