import type { string_book } from '@promptbook-local/types';
import type { AgentVisibility } from '../../utils/agentVisibility';

/**
 * Payload used when a guided new-agent surface switches to the classic Book editor.
 *
 * @private internal type of <NewAgentDialog/>.
 */
export type NewAgentOpenEditorRequest = {
    /**
     * Book source synthesized from the current guided surface.
     */
    readonly agentSource: string_book;

    /**
     * Visibility that should be used when the classic editor creates the agent.
     */
    readonly visibility: AgentVisibility;
};
