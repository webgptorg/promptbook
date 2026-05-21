import colors from 'colors';
import {
  Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
  Option
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { RefactorCandidateLevel } from '../../../../scripts/find-refactor-candidates/RefactorCandidateLevel';
import { DEFAULT_REFACTOR_CANDIDATE_LEVEL, getRefactorCandidateLevelDescription, REFACTOR_CANDIDATE_LEVEL_VALUES } from '../../../../scripts/find-refactor-candidates/RefactorCandidateLevel';
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
        spaceTrim(
            (block) => `
                Scan source files to identify refactoring candidates

                Levels:
                ${block(
                    REFACTOR_CANDIDATE_LEVEL_VALUES.map(
                        (level) => `- ${level}: ${getRefactorCandidateLevelDescription(level)}`,
                    ).join('\n'),
                )}

                Generates refactor prompts with guidance for identified candidates.
            `,
        ),
    );
    command.addOption(
        new Option('--level <level>', `Set scan aggressiveness (${REFACTOR_CANDIDATE_LEVEL_VALUES.join(', ')})`)
            .choices([...REFACTOR_CANDIDATE_LEVEL_VALUES])
            .default(DEFAULT_REFACTOR_CANDIDATE_LEVEL),
    );

    command.action(
        handleActionErrors(async (cliOptions) => {
            const { level = DEFAULT_REFACTOR_CANDIDATE_LEVEL } = cliOptions as {
                readonly level?: RefactorCandidateLevel;
            };

            // Note: Import the function dynamically to avoid loading heavy dependencies until needed
            const { findRefactorCandidates } = await import(
                '../../../../scripts/find-refactor-candidates/find-refactor-candidates'
            );

            try {
                await findRefactorCandidates({ level });
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

// Note: [🟡] Code for CLI command [find-refactor-candidates](src/cli/cli-commands/coder/find-refactor-candidates.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
