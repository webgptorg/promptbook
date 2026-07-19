import type { AgentVisibility } from '../../../../utils/agentVisibility';
import type { NewAgentOpenEditorRequest } from '../../NewAgentOpenEditorRequest';
import type { OnboardingState } from '../types';
import { createManGoAgentSource } from './createManGoAgentSource';

/**
 * Builds the classic Book editor payload from the current manGo onboarding state.
 *
 * @param state - Current imported wizard state.
 * @param defaultVisibility - Metadata-backed default visibility for newly created agents.
 * @returns Classic Book editor request carrying the current draft.
 *
 * @private internal utility of <ManGoNewAgentWizard/>.
 */
export function createManGoOpenEditorRequest(
    state: OnboardingState,
    defaultVisibility: AgentVisibility,
): NewAgentOpenEditorRequest {
    return {
        agentSource: createManGoAgentSource(state),
        visibility: defaultVisibility,
    };
}
