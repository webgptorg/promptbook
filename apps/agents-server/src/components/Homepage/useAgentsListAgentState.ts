'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';
import { DEFAULT_AGENT_VISIBILITY } from '../../utils/agentVisibility';
import type { AgentContextMenuRenamePayload } from '../AgentContextMenu/AgentContextMenu';
import { showAlert, showConfirm, showVisibilityDialog } from '../AsyncDialogs/asyncDialogs';
import { findAgentByIdentifier, getAgentIdentifier } from './agentOrganizationUtils';

/**
 * Setter for the interactive local agents cache.
 *
 * @private function of AgentsList
 */
type AgentOrganizationStateSetter = Dispatch<SetStateAction<AgentOrganizationAgent[]>>;

/**
 * Props accepted by the private agent-action hook.
 *
 * @private function of AgentsList
 */
type UseAgentsListAgentStateProps = {
    readonly agents: AgentOrganizationAgent[];
    readonly formatText: (text: string) => string;
    readonly setAgents: AgentOrganizationStateSetter;
    readonly synchronizeAfterMutation: (mutationName: string) => void;
};

/**
 * Agent-action handlers returned to the public `useAgentsListState` facade.
 *
 * @private function of AgentsList
 */
type UseAgentsListAgentStateResult = {
    readonly handleContextMenuAgentRenamed: (payload: AgentContextMenuRenamePayload) => void;
    readonly handleDelete: (agentIdentifier: string) => Promise<void>;
    readonly handleRequestAgentVisibilityChange: (agentIdentifier: string) => Promise<void>;
};

/**
 * Owns agent deletion, visibility, and rename side effects for `AgentsList`.
 *
 * @param props - Agent state and mutation helpers.
 * @returns Handlers for agent-level actions.
 *
 * @private function of AgentsList
 */
export function useAgentsListAgentState({
    agents,
    formatText,
    setAgents,
    synchronizeAfterMutation,
}: UseAgentsListAgentStateProps): UseAgentsListAgentStateResult {
    const handleDelete = useCallback(
        async (agentIdentifier: string) => {
            const agent = findAgentByIdentifier(agents, agentIdentifier);
            if (!agent) {
                return;
            }

            const confirmed = await showConfirm({
                title: formatText('Delete agent'),
                message: `${formatText('Delete agent')} "${agent.agentName}"? ${formatText(
                    'It will be moved to Recycle Bin.',
                )}`,
                confirmLabel: formatText('Delete agent'),
                cancelLabel: 'Cancel',
            }).catch(() => false);
            if (!confirmed) {
                return;
            }

            try {
                const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, { method: 'DELETE' });
                if (response.ok) {
                    setAgents((prev) => prev.filter((item) => getAgentIdentifier(item) !== agentIdentifier));
                    synchronizeAfterMutation('delete-agent');
                } else {
                    await showAlert({
                        title: 'Delete failed',
                        message: formatText('Failed to delete agent'),
                    }).catch(() => undefined);
                }
            } catch {
                await showAlert({
                    title: 'Delete failed',
                    message: formatText('Failed to delete agent'),
                }).catch(() => undefined);
            }
        },
        [agents, formatText, setAgents, synchronizeAfterMutation],
    );

    const handleRequestAgentVisibilityChange = useCallback(
        async (agentIdentifier: string) => {
            const agent = findAgentByIdentifier(agents, agentIdentifier);
            if (!agent) {
                return;
            }

            const selectedVisibility = await showVisibilityDialog({
                title: 'Update visibility',
                description: `${formatText('Set visibility for agent')} "${agent.agentName}".`,
                confirmLabel: 'Update visibility',
                initialVisibility: agent.visibility ?? DEFAULT_AGENT_VISIBILITY,
            }).catch(() => null);
            if (!selectedVisibility || selectedVisibility === agent.visibility) {
                return;
            }

            try {
                const response = await fetch(`/api/agents/${encodeURIComponent(agentIdentifier)}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ visibility: selectedVisibility }),
                });

                if (response.ok) {
                    setAgents((prev) =>
                        prev.map((item) =>
                            getAgentIdentifier(item) === agentIdentifier ? { ...item, visibility: selectedVisibility } : item,
                        ),
                    );
                    synchronizeAfterMutation('update-agent-visibility');
                } else {
                    await showAlert({
                        title: 'Update failed',
                        message: formatText('Failed to update agent visibility'),
                    }).catch(() => undefined);
                }
            } catch {
                await showAlert({
                    title: 'Update failed',
                    message: formatText('Failed to update agent visibility'),
                }).catch(() => undefined);
            }
        },
        [agents, formatText, setAgents, synchronizeAfterMutation],
    );

    const handleContextMenuAgentRenamed = useCallback(
        (payload: AgentContextMenuRenamePayload) => {
            setAgents((prev) =>
                prev.map((agent) => {
                    if (getAgentIdentifier(agent) !== payload.previousIdentifier) {
                        return agent;
                    }

                    return { ...agent, ...payload.agent };
                }),
            );
            synchronizeAfterMutation('rename-agent');
        },
        [setAgents, synchronizeAfterMutation],
    );

    return {
        handleContextMenuAgentRenamed,
        handleDelete,
        handleRequestAgentVisibilityChange,
    };
}
