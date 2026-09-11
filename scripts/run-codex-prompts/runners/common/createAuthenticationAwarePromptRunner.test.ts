import { AuthenticationError } from '../../../../src/errors/AuthenticationError';
import { ZERO_USAGE } from '../../../../src/execution/utils/usage-constants';
import type { PromptRunner } from '../types/PromptRunner';
import { createAuthenticationAwarePromptRunner } from './createAuthenticationAwarePromptRunner';

/**
 * Options passed to the wrapped runner, which the tested decorator only forwards.
 */
const PROMPT_RUN_OPTIONS = {
    prompt: 'Do something',
    scriptPath: '/tmp/prompt.sh',
    projectPath: '/project',
    logPath: '/tmp/prompt.log',
} as const;

/**
 * Creates one fake harness runner which always fails with the given raw CLI output.
 */
function createFailingRunner(harnessOutput: string): PromptRunner {
    return {
        name: 'fake-harness',
        runPrompt: async () => {
            throw new Error(harnessOutput);
        },
    };
}

describe('createAuthenticationAwarePromptRunner', () => {
    it('reports an expired harness login as a branded error with sign-in instructions', async () => {
        const runner = createAuthenticationAwarePromptRunner(
            createFailingRunner('{"result":"Failed to authenticate: OAuth session expired","type":"result"}'),
            'claude-code',
        );

        const error = await runner.runPrompt(PROMPT_RUN_OPTIONS).catch((thrownError: unknown) => thrownError);

        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as AuthenticationError).message).toContain('**Claude Code**');
        expect((error as AuthenticationError).message).toContain('Failed to authenticate: OAuth session expired');
        expect((error as AuthenticationError).message).toContain('`claude`');
        expect((error as AuthenticationError).message).toContain('`/login`');
    });

    it('names the dedicated login command of a harness which has one', async () => {
        const runner = createAuthenticationAwarePromptRunner(
            createFailingRunner('Error: not logged in'),
            'openai-codex',
        );

        const error = await runner.runPrompt(PROMPT_RUN_OPTIONS).catch((thrownError: unknown) => thrownError);

        expect((error as AuthenticationError).message).toContain('`codex login`');
    });

    it('leaves a failure which has nothing to do with authentication untouched', async () => {
        const originalError = new Error('Command "bash script.sh" exited with code 1');
        const runner = createAuthenticationAwarePromptRunner(
            {
                name: 'fake-harness',
                runPrompt: async () => {
                    throw originalError;
                },
            },
            'claude-code',
        );

        await expect(runner.runPrompt(PROMPT_RUN_OPTIONS)).rejects.toBe(originalError);
    });

    it('keeps the successful result and the subscription usage of the wrapped runner', async () => {
        const subscriptionUsage = { limits: [{ label: '5h', usedPercentage: 12 }] };
        const runner = createAuthenticationAwarePromptRunner(
            {
                name: 'fake-harness',
                runPrompt: async () => ({ usage: ZERO_USAGE }),
                getSubscriptionUsage: async () => subscriptionUsage,
            },
            'claude-code',
        );

        expect(await runner.runPrompt(PROMPT_RUN_OPTIONS)).toEqual({ usage: ZERO_USAGE });
        expect(await runner.getSubscriptionUsage?.()).toBe(subscriptionUsage);
    });
});
