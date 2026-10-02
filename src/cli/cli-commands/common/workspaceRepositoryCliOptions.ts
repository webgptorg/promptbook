import type { Command } from 'commander';
import { spaceTrim } from 'spacetrim';
import { addQuestionsOption } from './questionsCliOptions';

/**
 * Shared explanation of the workspace prerequisite, independent of commit and synchronization settings.
 * @private internal CLI help text
 */
export const WORKSPACE_REPOSITORY_DESCRIPTION = spaceTrim(`
    Workspace Git prerequisite:
    - Workspace actions inspect the enclosing Git working tree, including worktrees and submodules
    - ptbk init and ptbk coder init automatically initialize Git if it is missing; existing repositories are reused
    - Other mutating actions ask once before initializing Git in the displayed project directory
    - --no-questions and noninteractive input require an existing repository; recover with ptbk init, ptbk coder init, or git init
    - Read-only inspection and --dry-run only warn when Git is missing and never initialize it
    - --no-commit disables commits, not repository detection; a local repository needs no remote
`);

/**
 * Adds shared Git help and the questions switch to every workspace command without duplicating existing options.
 * @private internal registration helper for workspace CLI commands
 */
export function addWorkspaceRepositoryOptions(command: Command): void {
    if (!command.options.some((option) => option.long === '--no-questions')) addQuestionsOption(command);
    command.addHelpText('after', `\n${WORKSPACE_REPOSITORY_DESCRIPTION}\n`);
}

// Note: [🟡] Code for workspace CLI options [workspaceRepositoryCliOptions](src/cli/cli-commands/common/workspaceRepositoryCliOptions.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
