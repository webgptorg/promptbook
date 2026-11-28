import { debounce } from '@promptbook-local/utils';
import type { ProvidedServer } from '@/src/tools/$provideServer';
import { runWithServerContextOverride } from '@/src/tools/serverContextOverride';
import type { string_book } from '../../../../../src/book-2.0/agent-source/string_book';
import { recordAgentGoalChatLifecycleNote } from './recordAgentGoalChatLifecycleNote';

/**
 * Delay after the final persisted book update before the goal chat receives one modification note.
 */
export const AGENT_GOAL_CHAT_MODIFIED_NOTE_DEBOUNCE_DELAY_MS = 60_000;

/**
 * Agent identity used to write one delayed book-modification note.
 *
 * @private function of scheduleAgentGoalChatModifiedNote
 */
type AgentGoalChatModifiedNote = {
    readonly agentPermanentId: string;
    readonly agentName: string;
    readonly agentSource: string_book;
    readonly server: ProvidedServer;
};

/**
 * Runs delayed work under the server that owned the source update.
 *
 * @private function of scheduleAgentGoalChatModifiedNote
 */
type RunWithServerContext = (
    server: ProvidedServer,
    callback: () => Promise<void>,
) => Promise<void>;

/**
 * Creates an independent one-minute debounce for each agent's goal-chat modification note.
 *
 * @private function of scheduleAgentGoalChatModifiedNote
 */
export function createAgentGoalChatModifiedNoteScheduler(options?: {
    readonly recordAgentGoalChatLifecycleNote?: typeof recordAgentGoalChatLifecycleNote;
    readonly runWithServerContextOverride?: RunWithServerContext;
}): (agentGoalChatModifiedNote: AgentGoalChatModifiedNote) => void {
    const debouncedNoteRecordersByServerAndAgent = new Map<
        string,
        ((agentGoalChatModifiedNote: AgentGoalChatModifiedNote) => void) & { cancel: () => void }
    >();
    const recordLifecycleNote = options?.recordAgentGoalChatLifecycleNote || recordAgentGoalChatLifecycleNote;
    const runWithServerContext = options?.runWithServerContextOverride || runWithServerContextOverride;

    return (agentGoalChatModifiedNote: AgentGoalChatModifiedNote) => {
        const agentGoalChatModifiedNoteKey = createAgentGoalChatModifiedNoteKey(agentGoalChatModifiedNote);
        let debouncedNoteRecorder = debouncedNoteRecordersByServerAndAgent.get(agentGoalChatModifiedNoteKey);

        if (!debouncedNoteRecorder) {
            debouncedNoteRecorder = debounce((latestAgentGoalChatModifiedNote: AgentGoalChatModifiedNote) => {
                debouncedNoteRecordersByServerAndAgent.delete(agentGoalChatModifiedNoteKey);
                void runWithServerContext(latestAgentGoalChatModifiedNote.server, () =>
                    recordLifecycleNote({
                        event: 'MODIFIED',
                        agentPermanentId: latestAgentGoalChatModifiedNote.agentPermanentId,
                        agentName: latestAgentGoalChatModifiedNote.agentName,
                        agentSource: latestAgentGoalChatModifiedNote.agentSource,
                    }),
                );
            }, AGENT_GOAL_CHAT_MODIFIED_NOTE_DEBOUNCE_DELAY_MS);
            debouncedNoteRecordersByServerAndAgent.set(agentGoalChatModifiedNoteKey, debouncedNoteRecorder);
        }

        debouncedNoteRecorder(agentGoalChatModifiedNote);
    };
}

/**
 * Schedules one best-effort goal-chat note after the latest book update of each agent.
 */
export const scheduleAgentGoalChatModifiedNote = createAgentGoalChatModifiedNoteScheduler();

/**
 * Creates the per-server, per-agent key used to keep independent note debounces separate.
 *
 * @private function of scheduleAgentGoalChatModifiedNote
 */
function createAgentGoalChatModifiedNoteKey(agentGoalChatModifiedNote: AgentGoalChatModifiedNote): string {
    return JSON.stringify([agentGoalChatModifiedNote.server.tablePrefix, agentGoalChatModifiedNote.agentPermanentId]);
}
