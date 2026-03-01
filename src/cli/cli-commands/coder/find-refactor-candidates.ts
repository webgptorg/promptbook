import colors from 'colors';
import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import spaceTrim from 'spacetrim';
import { assertsError } from '../../../errors/assertsError';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import { handleActionErrors } from '../common/handleActionErrors';

/**
 * Initializes `coder find-refactor-candidates` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderFindRefactorCandidatesCommand(program: Program): $side_effect {
    const command = program.command('find-refactor-candidates');
    command.description(
        spaceTrim(`
            Scan source files to identify refactoring candidates

            Flags files that exceed:
            - Line count limits (500 lines per file by extension)
            - Entity count limits (max 4 entities per file)

            Generates refactor prompts with guidance for identified candidates.
        `),
    );

    command.action(
        handleActionErrors(async () => {
            // Note: Import the function dynamically to avoid loading heavy dependencies until needed
            const { findRefactorCandidates } = await import(
                '../../../../scripts/find-refactor-candidates/find-refactor-candidates'
            );

            try {
                await findRefactorCandidates();
            } catch (error) {
                assertsError(error);
                console.error(colors.bgRed(`${error.name}`));
                console.error(colors.red(error.stack || error.message));
                return process.exit(1);
            }

            return process.exit(0);
        }),
    );
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name
 * Note: [🟡] Code in this file should never be published outside of `@promptbook/cli`
 */
