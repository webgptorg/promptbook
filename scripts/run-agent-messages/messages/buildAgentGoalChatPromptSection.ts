import { spaceTrim } from 'spacetrim';
import type { AgentPlannedMessageSnapshot } from '../../../src/book-3.0/AgentPlannedMessagesSidecar';
import { formatTimeoutDurationHuman } from '../../../src/book-components/Chat/utils/timeoutToolCallPresentation';

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
 * wake-up is planned, and they repeat like `setInterval` until they are cancelled. The sidecar file is
 * the only channel that changes them, so an answer that merely claims a follow-up was planned changes
 * nothing — and an answer that changes nothing keeps the current plan running.
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

            You can plan a message that repeatedly wakes you in your singleton goal chat. A planned message works like \`setInterval\`, not like \`setTimeout\`: once planned, it keeps waking you at its interval until you cancel it. This works during every Agents Server-managed chat invocation, not only while answering inside the goal chat.

            ${block(buildCurrentPlannedMessagesLines(sidecar.currentPlannedMessages))}

            Editing \`${
                sidecar.relativeSidecarPath
            }\` is the **only** way to change what wakes you. Writing in your answer that you scheduled something does not schedule anything.

            -   **Keeping your planned messages as they are is the default.** When the list above already matches your goal, leave \`commands\` empty — every listed message keeps repeating on its own, and re-planning it would only duplicate it.
            -   When your goal needs a repeating wake-up that is not listed above, append \`{"action":"set","milliseconds":<repeat interval>,"message":"<what each future invocation must do>"}\` to the \`commands\` array of that file.
            -   When a listed message no longer matches your goal (for example your goal now says every 10 minutes while the message repeats every 5 minutes), append \`{"action":"cancel","timeoutId":"<timeout id>"}\` and one \`set\` command with the interval your goal really requires.
            -   When your goal no longer needs a listed message at all, cancel it without planning a replacement.
            -   Never edit \`version\`, \`agentPermanentId\`, or \`currentPlannedMessages\`.
            -   The Agents Server applies every command once your answer is finished, and each repetition appears in the goal chat and invokes you there.
            -   Only mention a planned follow-up in your answer when it is really planned: either you appended the matching \`set\` command, or you kept one of the messages listed above.
        `,
    );
}

/**
 * Renders the already planned messages so the agent can compare them with its goal.
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

    const plannedMessageLines = currentPlannedMessages.map(createCurrentPlannedMessageLine);

    return spaceTrim(
        (block) => `
            These planned messages are already waiting for you, so keep them unless they stopped matching your goal:

            ${block(plannedMessageLines.join('\n'))}
        `,
    );
}

/**
 * Renders one already planned message with the schedule the agent has to compare with its goal.
 *
 * @param plannedMessage - One planned message prepared by the Agents Server.
 * @returns Markdown list item.
 *
 * @private function of `buildAgentGoalChatPromptSection`
 */
function createCurrentPlannedMessageLine(plannedMessage: AgentPlannedMessageSnapshot): string {
    const message = plannedMessage.message?.trim() || 'Continue working towards the current goal.';
    const schedule = plannedMessage.intervalMs
        ? `repeats every ${formatTimeoutDurationHuman(plannedMessage.intervalMs)}`
        : `wakes you once at ${plannedMessage.dueAt}`;

    return `-   \`${plannedMessage.timeoutId}\` ${schedule}: ${message}`;
}
