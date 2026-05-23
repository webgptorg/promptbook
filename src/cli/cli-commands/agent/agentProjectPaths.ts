import { join } from 'path';
import { spaceTrim } from 'spacetrim';

/**
 * Relative path to the local agent source initialized by `ptbk agent init`.
 *
 * @private internal utility of `ptbk agent`
 */
export const AGENT_BOOK_FILE_PATH = 'agent.book';

/**
 * Relative path to the message queue root initialized by `ptbk agent init`.
 *
 * @private internal utility of `ptbk agent`
 */
export const AGENT_MESSAGES_DIRECTORY_PATH = 'messages';

/**
 * Relative path to queued user messages consumed by `ptbk agent run-once`.
 *
 * @private internal utility of `ptbk agent`
 */
export const AGENT_QUEUED_MESSAGES_DIRECTORY_PATH = join(AGENT_MESSAGES_DIRECTORY_PATH, 'queued');

/**
 * Relative path to answered messages written by `ptbk agent run-once`.
 *
 * @private internal utility of `ptbk agent`
 */
export const AGENT_FINISHED_MESSAGES_DIRECTORY_PATH = join(AGENT_MESSAGES_DIRECTORY_PATH, 'finished');

/**
 * Returns the default local agent book content.
 *
 * @private internal utility of `ptbk agent`
 */
export function getDefaultAgentBookContent(): string {
    return spaceTrim(`
        Local Agent

        GOAL Answer user questions from queued message files using the repository knowledge when useful.
        RULE Add the answer to the same message file under a new \`MESSAGE @Agent\` block.
        RULE Keep the answer focused on the most recent \`MESSAGE @User\` block.
        RULE Use files in the \`knowledge\` folder as the primary local knowledge source when they are relevant.
        RULE If the available information is not enough, say what is missing instead of inventing facts.
        CLOSED
    `);
}

/**
 * Returns the default local Book language manual content.
 *
 * @private internal utility of `ptbk agent`
 */
export function getDefaultBookLanguageManualContent(): string {
    return spaceTrim(`
        # Book language manual

        Book language defines a local AI agent as plain text. The first non-empty line is the agent name. Each following commitment starts with an uppercase keyword and continues until the next commitment.

        Common commitments:

        - \`GOAL\` describes what the agent should achieve.
        - \`RULE\` adds one behavioral constraint.
        - \`KNOWLEDGE\` adds inline facts or points to knowledge the agent should use.
        - \`LANGUAGE\` sets the expected response language.
        - \`TEAM\` references other agents that can be consulted.
        - \`CLOSED\` asks the agent to keep behavior stable instead of self-modifying.

        Example:

        \`\`\`book
        Support Agent

        GOAL Answer customer support questions.
        RULE Be concise and factual.
        KNOWLEDGE Product documentation is stored in the \`knowledge\` folder.
        CLOSED
        \`\`\`

        For \`ptbk agent\`, the CLI compiles \`agent.book\` into the coding-runner instructions, and the runner edits only the queued message file by appending an answer that starts with \`MESSAGE @Agent\`.
    `);
}

// Note: [🟡] Code for CLI command [agent](src/cli/cli-commands/agent/agentProjectPaths.ts) should never be published outside of `@promptbook/cli`
// Note: [💞] Ignore a discrepancy between file name and exported helper names
