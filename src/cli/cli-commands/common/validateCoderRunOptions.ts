import { spaceTrim } from 'spacetrim';
import type { RunOptions } from '../../../../scripts/run-codex-prompts/cli/RunOptions';
import { isCheckBeforeMode } from '../../../../scripts/run-codex-prompts/checks/CheckBeforeMode';
import { DatabaseError } from '../../../errors/DatabaseError';
import { NotAllowed } from '../../../errors/NotAllowed';

/**
 * Validates cross-flag constraints before workspace setup or the run starts.
 * @private shared validation for Coder execution commands
 */
export function validateCoderRunOptions(
    options: Pick<
        RunOptions,
        | 'checkCommand'
        | 'checkBefore'
        | 'allowDestructiveAutoMigrate'
        | 'autoMigrate'
        | 'noCommit'
        | 'waitForUser'
        | 'gitChanges'
        | 'autoPull'
        | 'dryRun'
        | 'isIsolated'
        | 'limit'
    >,
): void {
    if (options.checkCommand !== undefined && !options.checkCommand.trim()) {
        throw new NotAllowed(
            spaceTrim(`
            Option \`--check\` requires a non-empty shell command, for example \`npm run check\`.
        `),
        );
    }
    if (!isCheckBeforeMode(options.checkBefore ?? 'no')) {
        throw new NotAllowed(
            spaceTrim(`
                Invalid ${'`--check-before`'} mode: \`${String(options.checkBefore)}\`.

                Use one of: \`no\`, \`yes-and-fail\`, \`yes-and-fix\`.
            `),
        );
    }

    if (options.allowDestructiveAutoMigrate && !options.autoMigrate) {
        throw new DatabaseError(
            spaceTrim(`
                Flag \`--allow-destructive-auto-migrate\` requires \`--auto-migrate\`.
            `),
        );
    }

    if (options.noCommit && !options.waitForUser && options.gitChanges !== 'ignore') {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--no-commit\` requires \`--git-changes ignore\` when running in auto mode (the default; pass \`--no-auto\` for interactive confirmation).

                Without commits, the next prompt round would fail the clean working tree check.
            `),
        );
    }

    if (options.autoPull && options.noCommit && !options.dryRun) {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--auto-pull\` requires commits, so it cannot be combined with \`--no-commit\`.

                Auto-pull keeps the repository up to date between prompt rounds, which requires each successful round to end with a clean committed working tree.
            `),
        );
    }

    if (options.isIsolated && options.noCommit) {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--isolate\` cannot be combined with \`--no-commit\`.

                An isolated task is implemented in a temporary worktree and reaches the original branch only through a merge, which requires the round to end with a commit.
            `),
        );
    }

    if (options.isIsolated && options.gitChanges === 'continue') {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--isolate\` cannot be combined with \`--git-changes continue\`.

                An isolated task is implemented in a fresh temporary worktree checked out from the last commit, so the uncommitted changes of the interrupted prompt would be left behind instead of being continued.
            `),
        );
    }

    if (options.gitChanges === 'continue' && options.checkBefore === 'yes-and-fix') {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--git-changes continue\` cannot be combined with \`--check-before yes-and-fix\`.

                An interrupted prompt already has changes in progress, so there is no unmodified project state for pre-coding verification to repair.
            `),
        );
    }

    if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit <= 0)) {
        throw new NotAllowed(
            spaceTrim(`
                Flag \`--limit\` expects a positive integer.

                Received: \`${options.limit}\`
            `),
        );
    }
}

// Note: [🟡] Code for Coder run validation [validateCoderRunOptions](src/cli/cli-commands/common/validateCoderRunOptions.ts) should never be published outside of `@promptbook/cli`
