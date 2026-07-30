import type { HarnessDefinition } from './HarnessDefinition';

/**
 * Result of comparing the globally installed harness version with the newest published one.
 *
 * - `up-to-date` the newest published version is installed
 * - `outdated` an older version is installed
 * - `not-installed` the harness command is not available globally
 * - `unknown` the harness is installed but the newest published version could not be resolved, for example when offline
 *
 * @private internal utility of `promptbookCli`
 */
export type HarnessInstallationState = 'up-to-date' | 'outdated' | 'not-installed' | 'unknown';

/**
 * Installation state of one CLI coding harness on the current machine.
 *
 * @private internal utility of `promptbookCli`
 */
export type HarnessInstallationStatus = {
    /**
     * Harness the status belongs to.
     */
    readonly definition: HarnessDefinition;

    /**
     * Comparison of the installed version with the newest published one.
     */
    readonly installationState: HarnessInstallationState;

    /**
     * Version of the globally installed harness command or `null` when the harness is not installed.
     */
    readonly installedVersion: string | null;

    /**
     * Newest version published to npm or `null` when it could not be resolved.
     */
    readonly latestVersion: string | null;
};

// Note: [🟡] Code for CLI harness installation status [HarnessInstallationStatus](src/cli/cli-commands/common/harness/HarnessInstallationStatus.ts) should never be published outside of `@promptbook/cli`
