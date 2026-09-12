import type {
    Command as Program /* <- Note: [🔸] Using Program because Command is misleading name */,
} from 'commander';
import { spaceTrim } from 'spacetrim';
import { NotAllowed } from '../../../errors/NotAllowed';

/**
 * Commander option bag for opting out of every interactive question.
 *
 * @private internal utility of `promptbookCli`
 */
export type QuestionsCliOptions = {
    readonly questions: boolean;
};

/**
 * Normalized interactive-questions option shared by every `ptbk coder` command which can ask something.
 *
 * @private internal utility of `promptbookCli`
 */
export type NormalizedQuestionsCliOptions = {
    readonly isAskingQuestionsEnabled: boolean;
};

/**
 * Description block shared by the `ptbk coder` commands which can ask interactive questions.
 *
 * @private internal utility of `promptbookCli`
 */
export const QUESTIONS_DESCRIPTION = spaceTrim(`
    Interactive questions:
    - Steps which need an answer to continue are asked in the terminal
    - --no-questions never asks: an optional step is skipped with a note how to do it manually, a required one fails right away
`);

/**
 * Registers the shared `--no-questions` option on a `ptbk coder` command which can ask interactive questions.
 *
 * @private internal utility of `promptbookCli`
 */
export function addQuestionsOption(command: Program): void {
    command.option(
        '--no-questions',
        'Never ask an interactive question and skip every optional step which needs an answer to continue',
    );
}

/**
 * Converts the Commander questions flag into the normalized interactive-questions option.
 *
 * @private internal utility of `promptbookCli`
 */
export function normalizeQuestionsCliOptions(cliOptions: QuestionsCliOptions): NormalizedQuestionsCliOptions {
    return {
        isAskingQuestionsEnabled: cliOptions.questions,
    };
}

/**
 * Asserts that a command which waits for a user confirmation before each prompt is allowed to ask for it.
 *
 * @throws {NotAllowed} when `--no-auto` is combined with `--no-questions`
 * @private internal utility of `promptbookCli`
 */
export function assertUserConfirmationIsAllowed(options: {
    readonly isAskingQuestionsEnabled: boolean;
    readonly isWaitingForUser: boolean;
}): void {
    const { isAskingQuestionsEnabled, isWaitingForUser } = options;

    if (!isWaitingForUser || isAskingQuestionsEnabled) {
        return;
    }

    throw new NotAllowed(
        spaceTrim(`
            Flag \`--no-auto\` can not be used together with \`--no-questions\`.

            **There is nobody who could confirm each prompt when no question may be asked.**

            Actionable hints:
            - Keep \`--no-auto\` for a supervised run, for example \`ptbk coder run --harness claude-code --no-auto\`.
            - Keep \`--no-questions\` for an unattended run, for example \`ptbk coder run --harness claude-code --no-questions\`.
        `),
    );
}

// Note: [🟡] Code for CLI interactive questions options [questionsCliOptions](src/cli/cli-commands/common/questionsCliOptions.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
