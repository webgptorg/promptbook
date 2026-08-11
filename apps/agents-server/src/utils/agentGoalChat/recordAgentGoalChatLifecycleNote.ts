import { computeHash, serializeError } from '@promptbook-local/utils';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { appendAgentGoalChatNote } from './appendAgentGoalChatNote';
import {
    createAgentGoalChatLifecycleNoteContent,
    type AgentGoalChatLifecycleEvent,
} from './createAgentGoalChatNoteContent';
import { enqueueAgentGoalChatTurn } from './enqueueAgentGoalChatTurn';
import { resolveEffectiveAgentGoal } from './resolveEffectiveAgentGoal';

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
    readonly agentSource: string_book;
}): Promise<void> {
    try {
        const currentGoal = resolveEffectiveAgentGoal(options.agentSource);
        const content = createAgentGoalChatLifecycleNoteContent({
            event: options.event,
            agentName: options.agentName,
            currentGoal,
        });

        if (currentGoal) {
            await enqueueAgentGoalChatTurn({
                agentPermanentId: options.agentPermanentId,
                content,
                sourceFingerprint: computeHash(options.agentSource),
                trigger: options.event,
            });
        } else {
            await appendAgentGoalChatNote({
                agentPermanentId: options.agentPermanentId,
                content,
            });
        }
    } catch (error) {
        console.error('[agent-goal-chat]', 'lifecycle_note_failed', {
            event: options.event,
            agentPermanentId: options.agentPermanentId,
            error: serializeError(error as Error),
        });
    }
}
