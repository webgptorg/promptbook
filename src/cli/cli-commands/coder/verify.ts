import colors from 'colors';
import {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
    Option,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import type { VerifyPromptsOrder } from '../../../../scripts/verify-prompts/VerifyPromptsOrder';
import {
    DEFAULT_VERIFY_PROMPTS_ORDER,
    VERIFY_PROMPTS_ORDER_DESCRIPTIONS,
    VERIFY_PROMPTS_ORDER_VALUES,
} from '../../../../scripts/verify-prompts/VerifyPromptsOrder';
import type { $side_effect } from '../../../utils/organization/$side_effect';
import type { CoderGitSyncCliOptions } from '../common/coderGitSyncCliOptions';
import {
    addCoderGitSyncOptions,
    CODER_GIT_SYNC_DESCRIPTION,
    normalizeCoderGitSyncCliOptions,
} from '../common/coderGitSyncCliOptions';
import { handleActionErrors } from '../common/handleActionErrors';

/**
 * Initializes `coder verify` command for Promptbook CLI utilities
 *
 * Note: `$` is used to indicate that this function is not a pure function - it registers a command in the CLI
 *
 * @private internal function of `promptbookCli`
 */
export function $initializeCoderVerifyCommand(program: Program): $side_effect {
    const command = program.command('verify');
    command.description(
        spaceTrim(
            (block) => `
                Interactive verification helper for completed prompts

                Features:
                - Displays list of prompt files with status counts
                - Guides through verification of completed prompts marked [x]
                - Archives verified prompt files to prompts/done/ directory
                - Auto-appends repair prompts for incomplete work
                - Processes files with all-done prompts first
                - Supports ignoring matching prompt candidates for one verification run
                - Supports processing the prompt files from the earliest, from the latest or in random order

                ${block(CODER_GIT_SYNC_DESCRIPTION)}

                Note: The git synchronization is applied around each single verification, not once per run.
            `,
        ),
    );

    command.addOption(
        new Option(
            '--order <order>',
            spaceTrim(
                (block) => `
                    Order in which the prompt files are processed:
                    ${block(
                        VERIFY_PROMPTS_ORDER_VALUES.map(
                            (order) => `- ${order}: ${VERIFY_PROMPTS_ORDER_DESCRIPTIONS[order]}`,
                        ).join('\n'),
                    )}
                `,
            ),
        )
            .choices([...VERIFY_PROMPTS_ORDER_VALUES])
            .default(DEFAULT_VERIFY_PROMPTS_ORDER),
    );
    command.option(
        '--ignore <candidate-text>',
        'Ignore prompt files whose filename or first prompt line contains the given text (repeatable)',
        collectStringOption,
        [],
    );
    addCoderGitSyncOptions(command);

    command.action(
        handleActionErrors(async (cliOptions) => {
            const { order, ignore } = cliOptions as {
                readonly order: VerifyPromptsOrder;
                readonly ignore: ReadonlyArray<string>;
            } & CoderGitSyncCliOptions;

            const gitSync = normalizeCoderGitSyncCliOptions(cliOptions as CoderGitSyncCliOptions);

            // Note: Import the main function dynamically to avoid loading heavy dependencies until needed
            const { verifyPrompts } = await import('../../../../scripts/verify-prompts/verify-prompts');

            try {
                await verifyPrompts({ order, ignore, gitSync });
            } catch (error) {
                console.error(colors.bgRed('Prompt verification failed:'), error);
                return process.exit(1);
            }

            return process.exit(0);
        }),
    );
}

/**
 * Collects repeatable string options from Commander.
 *
 * @private internal utility of `coder verify` command
 */
function collectStringOption(value: string, previousValues: ReadonlyArray<string>): ReadonlyArray<string> {
    return [...previousValues, value];
}

// Note: [🟡] Code for CLI command [verify](src/cli/cli-commands/coder/verify.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and entity name
