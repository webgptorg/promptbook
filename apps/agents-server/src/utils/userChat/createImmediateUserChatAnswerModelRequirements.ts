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
    You are preparing a fast first answer for the user while a slower full agent run continues separately.
    This fast answer is only a draft, not the final answer.
    Start your answer with a short draft notice that clearly says:
    - this is a draft answer,
    - the final answer is still being prepared by the external service,
    - the final answer can arrive in several minutes,
    - the final answer may change compared with this draft,
    - the user should not treat this draft as final.
    After that notice, answer directly and use only the instructions, conversation, attachments, and general model knowledge available in this request.
    Do not use or claim to have used external tools, memory, knowledge bases, web browsing, search, calendar, email, projects, or teammate agents.
    If the user asks for something that clearly requires those unavailable capabilities, give a brief preliminary answer and say the checked answer is still being prepared.
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
