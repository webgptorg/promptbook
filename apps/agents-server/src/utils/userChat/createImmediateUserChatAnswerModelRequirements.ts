import type { ChatPrompt } from '@promptbook-local/types';
import { spaceTrim } from 'spacetrim';
import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';

/**
 * Commitments safe to use in the immediate answer without triggering slow tools, knowledge, imports, or memory.
 */
const IMMEDIATE_USER_CHAT_ANSWER_INSTRUCTION_COMMITMENTS = new Set<string>([
    'PERSONA',
    'PERSONAE',
    'GOAL',
    'GOALS',
    'RULE',
    'RULES',
    'LANGUAGE',
    'LANGUAGES',
    'STYLE',
    'STYLES',
    'WRITING RULES',
    'FORMAT',
    'FORMATS',
    'SCENARIO',
    'SCENARIOS',
]);

/**
 * Prefix added to the immediate answer system message.
 */
const IMMEDIATE_USER_CHAT_ANSWER_SYSTEM_PREAMBLE = spaceTrim(`
    You are preparing a fast draft answer for the user while a slower full agent run continues separately.
    This response is not the final answer.
    These immediate-answer rules override any agent instruction below that would make the answer sound final.

    At the start of every response, clearly say in the user's language:
    - This is only a draft or preliminary answer, not the final answer.
    - The final answer will arrive in several minutes after the external service finishes processing.
    - The final answer can change or correct this draft, so the user should not treat this draft as final.

    After that notice, give a brief useful draft of what is happening or the likely answer.
    Answer directly and use only the instructions, conversation, attachments, and general model knowledge available in this request.
    Do not use or claim to have used external tools, memory, knowledge bases, web browsing, search, calendar, email, projects, or teammate agents.
    Never present this draft as complete or definitive.
    If the user asks for something that clearly requires those unavailable capabilities, explain that the checked final answer is still being prepared.
`);

/**
 * Creates the lightweight model requirements used by the immediate answer path.
 */
export function createImmediateUserChatAnswerModelRequirements(
    agentSource: string_book,
): ChatPrompt['modelRequirements'] {
    const parsedAgentSource = parseAgentSource(agentSource);
    const parsedCommitments = parseAgentSourceWithCommitments(agentSource).commitments;
    const instructionSections = parsedCommitments
        .filter((commitment) => IMMEDIATE_USER_CHAT_ANSWER_INSTRUCTION_COMMITMENTS.has(commitment.type))
        .map((commitment) => `${commitment.type}: ${commitment.content}`.trim())
        .filter((section) => section.length > 0);
    const agentName = parsedAgentSource.meta.fullname || parsedAgentSource.agentName || 'Agent';
    const systemMessage = spaceTrim(
        (block) => `
            ${IMMEDIATE_USER_CHAT_ANSWER_SYSTEM_PREAMBLE}

            Agent name:
            ${agentName}

            ${block(instructionSections.length > 0 ? `Agent instructions:\n${instructionSections.join('\n\n')}` : '')}
        `,
    );

    return {
        modelVariant: 'CHAT',
        systemMessage,
    };
}
