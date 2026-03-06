'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AgentCapability, AgentChipData } from '@promptbook-local/types';
import { createTeamToolNameFromUrl } from '../../../../../../src/book-components/Chat/utils/createTeamToolNameFromUrl';

/** Cache storing resolved agent chip data for team capabilities. */
const TEAM_AGENT_PROFILE_CACHE = new Map<string, AgentChipData>();
/** Pending fetch promises to deduplicate concurrent profile requests. */
const TEAM_AGENT_PROFILE_REQUESTS = new Map<string, Promise<AgentChipData | null>>();

/**
 * Descriptor that links a team capability to a tool name.
 */
type TeamCapabilityDescriptor = {
    agentUrl: string;
    label?: string;
    toolName: string;
};

/**
 * Simplified response shape returned by the `/api/team-agent-profile` proxy.
 */
type TeamAgentProfileDto = {
    url: string;
    label?: string;
    imageUrl?: string;
};

/**
 * Normalizes teammate URLs so caching keys are stable.
 *
 * @private function of useTeamAgentProfiles
 */
function normalizeTeamAgentUrl(agentUrl: string): string {
    return agentUrl.replace(/\/$/, '');
}

/**
 * Builds a stable public base URL used for placeholder images.
 *
 * @private function of useTeamAgentProfiles
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
 * Fetches teammate profile metadata through the server-side proxy to avoid CORS issues.
 *
 * @private function of useTeamAgentProfiles
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
                console.warn('[useTeamAgentProfiles] Failed to load team agent profile', normalizedUrl, error);
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
 * Hook that resolves team capability metadata into agent chip data used by tool call chips.
 *
 * @private hook of AgentChatWrapper
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
