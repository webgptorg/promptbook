import type { HarnessAuthenticationMethod } from '../../../../src/cli/cli-commands/common/harness/HarnessDefinition';
import { getHarnessDefinition } from '../../../../src/cli/cli-commands/common/harness/HarnessDefinition';
import type { PromptRunnerHarnessName } from '../../../../src/cli/cli-commands/common/promptRunnerCliOptions';
import { AuthenticationError } from '../../../../src/errors/AuthenticationError';
import { spaceTrim } from '../../../../src/utils/organization/spaceTrim';

/**
 * Options for building the error reported when a harness is not logged in.
 */
type BuildHarnessAuthenticationErrorOptions = {
    /**
     * Harness which refused to work.
     */
    readonly harnessName: PromptRunnerHarnessName;

    /**
     * Short reason the harness itself reported, as extracted from its output.
     */
    readonly reason: string;
};

/**
 * Builds the branded error which tells the user that the selected harness has to be signed in again.
 */
export function buildHarnessAuthenticationError(
    options: BuildHarnessAuthenticationErrorOptions,
): AuthenticationError {
    const { harnessName, reason } = options;
    const { label, authenticationMethod } = getHarnessDefinition(harnessName);

    return new AuthenticationError(
        spaceTrim(
            (block) => `
                The **${label}** harness is not authenticated, so the prompt was not run.

                ${label} reported:
                > ${reason}

                ${block(buildSignInInstruction(authenticationMethod))}

                Once you are signed in, start the very same \`ptbk coder\` command again.
            `,
        ),
    );
}

/**
 * Builds the sentence which tells the user how to sign in to one harness again.
 */
function buildSignInInstruction(authenticationMethod: HarnessAuthenticationMethod): string {
    const { command, interactiveStep } = authenticationMethod;

    if (interactiveStep === undefined) {
        return `Sign in again by running \`${command}\`.`;
    }

    return `Sign in again by running \`${command}\` and then ${interactiveStep}.`;
}
