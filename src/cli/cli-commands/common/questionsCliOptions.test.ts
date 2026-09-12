import { Command } from 'commander';
import { NotAllowed } from '../../../errors/NotAllowed';
import {
    addQuestionsOption,
    assertUserConfirmationIsAllowed,
    normalizeQuestionsCliOptions,
    type QuestionsCliOptions,
} from './questionsCliOptions';

/**
 * Parses the shared questions flag exactly like a `ptbk coder` command does.
 */
function parseQuestionsCliOptions(args: ReadonlyArray<string>): QuestionsCliOptions {
    const command = new Command('run');
    command.exitOverride();
    addQuestionsOption(command);
    command.parse([...args], { from: 'user' });
    return command.opts() as QuestionsCliOptions;
}

describe('addQuestionsOption', () => {
    it('asks interactive questions by default', () => {
        expect(parseQuestionsCliOptions([])).toEqual({ questions: true });
    });

    it('disables interactive questions when --no-questions is used', () => {
        expect(parseQuestionsCliOptions(['--no-questions'])).toEqual({ questions: false });
    });
});

describe('normalizeQuestionsCliOptions', () => {
    it('normalizes the enabled interactive questions', () => {
        expect(normalizeQuestionsCliOptions(parseQuestionsCliOptions([]))).toEqual({
            isAskingQuestionsEnabled: true,
        });
    });

    it('normalizes the disabled interactive questions', () => {
        expect(normalizeQuestionsCliOptions(parseQuestionsCliOptions(['--no-questions']))).toEqual({
            isAskingQuestionsEnabled: false,
        });
    });
});

describe('assertUserConfirmationIsAllowed', () => {
    it('allows waiting for the user when the questions are enabled', () => {
        expect(() =>
            assertUserConfirmationIsAllowed({ isAskingQuestionsEnabled: true, isWaitingForUser: true }),
        ).not.toThrow();
    });

    it('allows disabled questions when nothing waits for the user', () => {
        expect(() =>
            assertUserConfirmationIsAllowed({ isAskingQuestionsEnabled: false, isWaitingForUser: false }),
        ).not.toThrow();
    });

    it('refuses to wait for a user confirmation which can never be asked', () => {
        expect(() =>
            assertUserConfirmationIsAllowed({ isAskingQuestionsEnabled: false, isWaitingForUser: true }),
        ).toThrow(NotAllowed);
    });
});

// Note: [🟡] Code for CLI interactive questions option tests [questionsCliOptions.test](src/cli/cli-commands/common/questionsCliOptions.test.ts) should never be published outside of `@promptbook/cli`
