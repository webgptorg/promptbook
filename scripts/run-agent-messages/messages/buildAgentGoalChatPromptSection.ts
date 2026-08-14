import { spaceTrim } from 'spacetrim';
import type { AgentPlannedMessageSnapshot } from '../../../src/book-3.0/AgentPlannedMessagesSidecar';

/**
 * Planned-message sidecar information made visible to one coding-harness prompt.
 */
export type AgentPlannedMessagesPromptSidecar = {
    /**
     * Portable path of the sidecar inside the agent folder.
     */
    readonly relativeSidecarPath: string;

    /**
     * Planned messages that are already waiting to wake the agent.
     */
    readonly currentPlannedMessages: ReadonlyArray<AgentPlannedMessageSnapshot>;
};

/**
 * Builds the planned-message instructions available to an Agents Server-managed coding agent.
 *
 * Planned messages always target the agent's singleton goal chat, regardless of the chat in which the
 * wake-up is planned. The sidecar file is the only channel that actually schedules one, so an answer
 * that merely claims a follow-up was planned changes nothing.
 *
 * @param sidecar - Sidecar prepared by the Agents Server for the answered message.
 * @returns Prompt section, or an empty string outside Agents Server-managed runs.
 */
export function buildAgentGoalChatPromptSection(sidecar: AgentPlannedMessagesPromptSidecar | undefined): string {
    if (!sidecar) {
        return '';
    }

    return spaceTrim(
        (block) => `
            ## Planned goal-chat messages

            You can plan a future message that wakes you in your singleton goal chat. This works during every Agents Server-managed chat invocation, not only while answering inside the goal chat.

            ${block(buildCurrentPlannedMessagesLines(sidecar.currentPlannedMessages))}

            Editing \`${
                sidecar.relativeSidecarPath
            }\` is the **only** way to plan or cancel a wake-up. Writing in your answer that you scheduled something does not schedule anything.

            -   To plan a wake-up, append \`{"action":"set","milliseconds":<positive delay>,"message":"<what your future invocation must do>"}\` to the \`commands\` array of that file.
            -   To cancel one of the planned messages listed above, append \`{"action":"cancel","timeoutId":"<timeout id>"}\` instead.
            -   Leave \`commands\` empty when no future wake-up is useful, and never edit \`version\`, \`agentPermanentId\`, or \`currentPlannedMessages\`.
            -   The Agents Server applies every command once your answer is finished, and a fired message appears in the goal chat and invokes you there. If more future work remains, plan the next message during that invocation.
            -   Only mention a planned follow-up in your answer when you really appended the matching \`set\` command.
        `,
    );
}

/**
 * Renders the already planned messages so the agent does not create duplicates.
 *
 * @param currentPlannedMessages - Planned messages prepared by the Agents Server.
 * @returns Markdown list, or a sentence stating that nothing is planned yet.
 *
 * @private function of `buildAgentGoalChatPromptSection`
 */
function buildCurrentPlannedMessagesLines(currentPlannedMessages: ReadonlyArray<AgentPlannedMessageSnapshot>): string {
    if (currentPlannedMessages.length === 0) {
        return 'You currently have no planned messages waiting.';
    }

    const plannedMessageLines = currentPlannedMessages.map(
        (plannedMessage) =>
            `-   \`${plannedMessage.timeoutId}\` at ${plannedMessage.dueAt}: ${
                plannedMessage.message?.trim() || 'Continue working towards the current goal.'
            }`,
    );

    return spaceTrim(
        (block) => `
            You already planned these messages, so do not create duplicates:

            ${block(plannedMessageLines.join('\n'))}
        `,
    );
}
