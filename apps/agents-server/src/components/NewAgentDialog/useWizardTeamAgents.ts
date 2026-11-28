'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AgentOrganizationAgent } from '../../utils/agentOrganization/types';
import { normalizeServerUrl } from '../Homepage/normalizeServerUrl';
import { useFederatedAgents, type AgentWithVisibility } from '../Homepage/useFederatedAgents';

/**
 * API payload returned by `/api/agent-organization`.
 */
type AgentOrganizationResponse = {
    readonly success: boolean;
    readonly agents?: ReadonlyArray<AgentOrganizationAgent>;
    readonly error?: string;
};

/**
 * Status of the local-agent list request inside the team picker.
 */
type LocalTeamAgentsStatus = {
    status: 'loading' | 'success' | 'error';
    error?: string;
};

/**
 * Agent shape consumed by the wizard teammate picker.
 */
export type WizardTeamAgent = AgentWithVisibility & {
    readonly url: string;
};

/**
 * Builds the canonical URL for one local agent card.
 *
 * @param currentServerUrl - Base URL of the current Agents Server instance.
 * @param agent - Local agent record.
 * @returns Canonical profile URL.
 */
function createLocalAgentUrl(currentServerUrl: string, agent: AgentOrganizationAgent): string {
    return `${currentServerUrl}/agents/${encodeURIComponent(agent.permanentId || agent.agentName)}`;
}

/**
 * Returns the best human-readable label for sorting wizard teammate cards.
 *
 * @param agent - Agent to label.
 * @returns Full name or fallback agent name.
 */
function getWizardTeamAgentLabel(agent: Pick<WizardTeamAgent, 'agentName' | 'meta'>): string {
    return agent.meta.fullname || agent.agentName;
}

/**
 * Sorts teammate cards by their display name while keeping the original records intact.
 *
 * @param agents - Agents to sort.
 * @returns Sorted teammate cards.
 */
function sortWizardTeamAgents(agents: ReadonlyArray<WizardTeamAgent>): Array<WizardTeamAgent> {
    return [...agents].sort((leftAgent, rightAgent) =>
        getWizardTeamAgentLabel(leftAgent).localeCompare(getWizardTeamAgentLabel(rightAgent), undefined, {
            sensitivity: 'base',
        }),
    );
}

/**
 * Loads local and federated agents for the wizard teammate picker.
 *
 * @returns Current server URL together with local/federated agent cards and loading state.
 */
export function useWizardTeamAgents() {
    const currentServerUrl = useMemo(
        () => (typeof window === 'undefined' ? '' : normalizeServerUrl(window.location.origin)),
        [],
    );
    const [localAgents, setLocalAgents] = useState<Array<WizardTeamAgent>>([]);
    const [localAgentsStatus, setLocalAgentsStatus] = useState<LocalTeamAgentsStatus>({ status: 'loading' });
    const { federatedAgents, federatedServersStatus } = useFederatedAgents(true);

    useEffect(() => {
        if (!currentServerUrl) {
            return;
        }

        let isCancelled = false;
        const abortController = new AbortController();

        setLocalAgentsStatus({ status: 'loading' });

        void fetch('/api/agent-organization', {
            method: 'GET',
            cache: 'no-store',
            signal: abortController.signal,
        })
            .then(async (response) => {
                const payload = (await response.json().catch(() => ({}))) as AgentOrganizationResponse;

                if (!response.ok || !payload.success || !Array.isArray(payload.agents)) {
                    throw new Error(payload.error || 'Failed to load organization snapshot.');
                }

                if (isCancelled) {
                    return;
                }

                setLocalAgents(
                    sortWizardTeamAgents(
                        payload.agents.map((agent) => ({
                            ...agent,
                            serverUrl: currentServerUrl,
                            url: createLocalAgentUrl(currentServerUrl, agent),
                        })),
                    ),
                );
                setLocalAgentsStatus({ status: 'success' });
            })
            .catch((error) => {
                if (isCancelled || abortController.signal.aborted) {
                    return;
                }

                setLocalAgents([]);
                setLocalAgentsStatus({
                    status: 'error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            });

        return () => {
            isCancelled = true;
            abortController.abort();
        };
    }, [currentServerUrl]);

    const federatedTeamAgents = useMemo(
        () =>
            sortWizardTeamAgents(
                federatedAgents
                    .filter((agent) => normalizeServerUrl(agent.serverUrl || '') !== currentServerUrl)
                    .map((agent) => ({
                        ...agent,
                        url:
                            agent.url ||
                            `${normalizeServerUrl(agent.serverUrl || currentServerUrl)}/agents/${encodeURIComponent(
                                agent.permanentId || agent.agentName,
                            )}`,
                    })),
            ),
        [currentServerUrl, federatedAgents],
    );

    const federatedServerUrls = useMemo(() => {
        const orderedServerUrls: Array<string> = [];

        for (const rawServerUrl of Object.keys(federatedServersStatus)) {
            const normalizedServerUrl = normalizeServerUrl(rawServerUrl);
            if (!normalizedServerUrl || normalizedServerUrl === currentServerUrl) {
                continue;
            }

            orderedServerUrls.push(normalizedServerUrl);
        }

        for (const agent of federatedTeamAgents) {
            const normalizedServerUrl = normalizeServerUrl(agent.serverUrl || '');
            if (!normalizedServerUrl || normalizedServerUrl === currentServerUrl) {
                continue;
            }

            if (!orderedServerUrls.includes(normalizedServerUrl)) {
                orderedServerUrls.push(normalizedServerUrl);
            }
        }

        return orderedServerUrls;
    }, [currentServerUrl, federatedServersStatus, federatedTeamAgents]);

    return {
        currentServerUrl,
        localAgents,
        localAgentsStatus,
        federatedTeamAgents,
        federatedServersStatus,
        federatedServerUrls,
    };
}
