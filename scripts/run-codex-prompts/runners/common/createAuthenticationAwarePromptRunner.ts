import type { PromptRunnerHarnessName } from '../../../../src/cli/cli-commands/common/promptRunnerCliOptions';
import { formatUnknownErrorMessage } from '../../common/formatUnknownErrorMessage';
import type { PromptRunner } from '../types/PromptRunner';
import { buildHarnessAuthenticationError } from './buildHarnessAuthenticationError';
import { extractHarnessAuthenticationFailureReason } from './extractHarnessAuthenticationFailureReason';

/**
 * Wraps one prompt runner so a failure caused by a missing or expired harness login is reported as a branded
 * `AuthenticationError` which tells the user how to sign in again.
 *
 * Each harness reports its own failures differently, but all of them report them by failing `runPrompt` with
 * the raw CLI output as the message. Translating the failure here therefore keeps exactly one place which has
 * to recognize an unauthenticated harness, for every harness and for every command which runs prompts.
 */
export function createAuthenticationAwarePromptRunner(
    runner: PromptRunner,
    harnessName: PromptRunnerHarnessName,
): PromptRunner {
    return {
        name: runner.name,
        runPrompt: async (options) => {
            try {
                return await runner.runPrompt(options);
            } catch (error) {
                const reason = extractHarnessAuthenticationFailureReason(formatUnknownErrorMessage(error));

                if (reason === undefined) {
                    throw error;
                }

                throw buildHarnessAuthenticationError({ harnessName, reason });
            }
        },
        getSubscriptionUsage: runner.getSubscriptionUsage?.bind(runner),
    };
}
