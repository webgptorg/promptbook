/**
 * How an outdated CLI coding harness can be brought up to date where it is really installed.
 *
 * @private internal utility of `promptbookCli`
 */
export type HarnessUpdatePlan = {
    /**
     * Command which updates the harness in place
     * or `null` when the installation is not understood well enough to name one.
     */
    readonly command: string | null;

    /**
     * Whether Promptbook may run the command itself instead of only printing it.
     *
     * Only installations which Promptbook can update without any side effect are updated automatically,
     * everything else is left to the user together with the instructions.
     */
    readonly isRunnableByPromptbook: boolean;

    /**
     * Extra environment variables required by the update command.
     */
    readonly environment?: Readonly<Record<string, string>>;
};

// Note: [🟡] Code for CLI harness update plan [HarnessUpdatePlan](src/cli/cli-commands/common/harness/HarnessUpdatePlan.ts) should never be published outside of `@promptbook/cli`
