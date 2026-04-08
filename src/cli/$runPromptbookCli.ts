import { promptbookCli } from './promptbookCli';

/**
 * Tracks whether CLI runtime registrations were already initialized in this process.
 *
 * @private internal utility of Promptbook CLI bootstrap
 */
let isCliRuntimeRegistered = false;

/**
 * Shared bootstrap for Promptbook CLI used by both local `ts-node` and packaged `npx` entrypoints.
 *
 * @private internal utility of Promptbook CLI bootstrap
 */
export async function $runPromptbookCli(): Promise<void> {
    if (!isCliRuntimeRegistered) {
        await import('../_packages/cli.index');
        isCliRuntimeRegistered = true;
    }

    await promptbookCli();
}

// Note: [🟡] Code for CLI bootstrap [$runPromptbookCli](src/cli/$runPromptbookCli.ts) should never be published outside of `@promptbook/cli`
