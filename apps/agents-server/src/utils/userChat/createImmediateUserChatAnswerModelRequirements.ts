import type { ChatPrompt } from '@promptbook-local/types';
import { spaceTrim } from 'spacetrim';
import { parseAgentSource } from '../../../../../src/book-2.0/agent-source/parseAgentSource';
import { parseAgentSourceWithCommitments } from '../../../../../src/book-2.0/agent-source/parseAgentSourceWithCommitments';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';

/**
 * Commitments safe to use in the immediate pre-answer without triggering slow tools, knowledge, imports, or memory.
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
 * Prefix added to the immediate pre-answer system message.
 */
const IMMEDIATE_USER_CHAT_ANSWER_SYSTEM_PREAMBLE = spaceTrim(`
    You are preparing a short in-progress confirmation for the user while a slower full agent run continues separately.
    This response is not the final answer. It is only a confirmation that the task is being handled.
    These immediate-answer rules override any agent instruction below that would make the answer sound final or complete.

    At the start of every response, clearly say in the user's language:
    - You understood what the user wants.
    - You are working on it now or the job has already started.
    - The final answer will arrive after the background processing finishes.

    Keep the whole response short, preferably one or two sentences.
    Do not provide any part of the final answer yet.
    Do not include code snippets, detailed steps, calculations, drafted content, likely conclusions, or partial deliverables.
    If helpful, briefly name the kind of work being done, such as writing code, checking something, preparing an answer, or generating an image.
    Answer directly and use only the instructions, conversation, attachments, and general model knowledge available in this request.
    Do not use or claim to have used external tools, memory, knowledge bases, web browsing, search, calendar, email, projects, or teammate agents.
    Never present this message as complete, definitive, or ready to use.
    If the user asks for something that clearly requires unavailable capabilities, simply say the checked final answer is still being prepared.
`);

/**
 * Creates the lightweight model requirements used by the immediate pre-answer path.
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
