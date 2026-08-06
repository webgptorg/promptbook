import { serializeError } from '@promptbook-local/utils';
import { appendAgentGoalChatNote } from './appendAgentGoalChatNote';
import {
    createAgentGoalChatLifecycleNoteContent,
    type AgentGoalChatLifecycleEvent,
} from './createAgentGoalChatNoteContent';

/**
 * Leaves the goal-chat note that records one agent lifecycle event.
 *
 * Writing the note is best-effort on purpose: creating or saving an agent must never fail because
 * its goal chat could not be updated.
 *
 * @param options - Lifecycle event together with the affected agent.
 */
export async function recordAgentGoalChatLifecycleNote(options: {
    readonly event: AgentGoalChatLifecycleEvent;
    readonly agentPermanentId: string;
    readonly agentName: string;
}): Promise<void> {
    try {
        await appendAgentGoalChatNote({
            agentPermanentId: options.agentPermanentId,
            content: createAgentGoalChatLifecycleNoteContent({
                event: options.event,
                agentName: options.agentName,
            }),
        });
    } catch (error) {
        console.error('[agent-goal-chat]', 'lifecycle_note_failed', {
            event: options.event,
            agentPermanentId: options.agentPermanentId,
            error: serializeError(error as Error),
        });
    }
}
