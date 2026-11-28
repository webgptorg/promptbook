import type { AgentCapability, AgentChipData } from '@promptbook-local/types';
import { useEffect, useMemo, useState } from 'react';
import { createTeamToolNameFromUrl } from '../../../../../../src/book-components/Chat/utils/createTeamToolNameFromUrl';

/**
 * Team capability descriptor resolved from agent capabilities.
 *
 * @private function of AgentChatWrapper
 */
type TeamCapabilityDescriptor = {
    /**
     * Teammate agent URL.
     */
    readonly agentUrl: string;
    /**
     * Optional teammate display label.
     */
    readonly label?: string;
    /**
     * Derived TEAM tool name.
     */
    readonly toolName: string;
};

/**
 * Team profile payload returned by `/api/team-agent-profile`.
 *
 * @private function of AgentChatWrapper
 */
type TeamAgentProfileDto = {
    /**
     * Canonical teammate URL.
     */
    readonly url: string;
    /**
     * Optional teammate label.
     */
    readonly label?: string;
    /**
     * Optional teammate avatar URL.
     */
    readonly imageUrl?: string;
};

/**
 * Shared in-memory profile cache across chat wrapper instances.
 *
 * @private function of AgentChatWrapper
 */
const TEAM_AGENT_PROFILE_CACHE = new Map<string, AgentChipData>();

/**
 * Shared in-flight request cache used to deduplicate teammate-profile fetches.
 *
 * @private function of AgentChatWrapper
 */
const TEAM_AGENT_PROFILE_REQUESTS = new Map<string, Promise<AgentChipData | null>>();

/**
 * Normalizes teammate URLs so cache keys remain stable.
 *
 * @private function of AgentChatWrapper
 */
function normalizeTeamAgentUrl(agentUrl: string): string {
    return agentUrl.replace(/\/$/, '');
}

/**
 * Resolves the teammate public URL used for placeholder images.
 *
 * @private function of AgentChatWrapper
 */
function resolveTeamAgentPublicUrl(agentUrl: string): string | undefined {
    try {
        const parsed = new URL(agentUrl);
        return `${parsed.origin}/`;
    } catch {
        return undefined;
    }
}

/**
 * Fetches teammate profile metadata through the server proxy to avoid CORS issues.
 *
 * @private function of AgentChatWrapper
 */
async function requestTeamAgentProfile(agentUrl: string): Promise<AgentChipData | null> {
    const normalizedUrl = normalizeTeamAgentUrl(agentUrl);
    const cached = TEAM_AGENT_PROFILE_CACHE.get(normalizedUrl);
    if (cached) {
        return cached;
    }

    let pending = TEAM_AGENT_PROFILE_REQUESTS.get(normalizedUrl);
    if (!pending) {
        const apiUrl = `/api/team-agent-profile?url=${encodeURIComponent(normalizedUrl)}`;
        pending = (async (): Promise<AgentChipData | null> => {
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    return null;
                }

                const payload = (await response.json()) as TeamAgentProfileDto;
                const publicUrl = resolveTeamAgentPublicUrl(normalizedUrl);

                return {
                    url: payload.url || normalizedUrl,
                    label: payload.label,
                    imageUrl: payload.imageUrl,
                    publicUrl,
                };
            } catch (error) {
                console.warn('[AgentChatWrapper] Failed to load team agent profile', normalizedUrl, error);
                return null;
            }
        })();

        TEAM_AGENT_PROFILE_REQUESTS.set(normalizedUrl, pending);
    }

    const result = await pending;
    TEAM_AGENT_PROFILE_REQUESTS.delete(normalizedUrl);
    if (result) {
        TEAM_AGENT_PROFILE_CACHE.set(normalizedUrl, result);
    }

    return result;
}

/**
 * Resolves TEAM capabilities into agent-chip metadata used by chat tool-call chips.
 *
 * @private function of AgentChatWrapper
 */
export function useTeamAgentProfiles(capabilities?: ReadonlyArray<AgentCapability>): Record<string, AgentChipData> {
    const descriptors = useMemo<TeamCapabilityDescriptor[]>(() => {
        if (!capabilities?.length) {
            return [];
        }

        return capabilities
            .filter((capability): capability is AgentCapability & { agentUrl: string } => {
                return capability.type === 'team' && Boolean(capability.agentUrl);
            })
            .map((capability) => ({
                agentUrl: capability.agentUrl,
                label: capability.label,
                toolName: createTeamToolNameFromUrl(capability.agentUrl, capability.label),
            }));
    }, [capabilities]);

    const [profiles, setProfiles] = useState<Record<string, AgentChipData>>({});

    useEffect(() => {
        if (descriptors.length === 0) {
            setProfiles({});
            return;
        }

        const baseline: Record<string, AgentChipData> = {};
        for (const descriptor of descriptors) {
            baseline[descriptor.toolName] = {
                url: normalizeTeamAgentUrl(descriptor.agentUrl),
                label: descriptor.label,
                publicUrl: resolveTeamAgentPublicUrl(descriptor.agentUrl),
            };
        }

        let isActive = true;
        setProfiles(baseline);

        const loadProfiles = async () => {
            const updated = { ...baseline };

            await Promise.all(
                descriptors.map(async (descriptor) => {
                    const profile = await requestTeamAgentProfile(descriptor.agentUrl);
                    if (!profile) {
                        return;
                    }

                    updated[descriptor.toolName] = {
                        ...profile,
                        label: profile.label || descriptor.label,
                        url: profile.url || normalizeTeamAgentUrl(descriptor.agentUrl),
                        publicUrl: profile.publicUrl || resolveTeamAgentPublicUrl(descriptor.agentUrl),
                    };
                }),
            );

            if (isActive) {
                setProfiles(updated);
            }
        };

        void loadProfiles();

        return () => {
            isActive = false;
        };
    }, [descriptors]);

    return profiles;
}

