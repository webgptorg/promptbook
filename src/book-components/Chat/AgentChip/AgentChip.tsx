'use client';

import { useEffect, useState } from 'react';
import { generatePlaceholderAgentProfileImageUrl } from '../../../_packages/core.index';
import type { string_url } from '../../../types/typeAliases';
import styles from './AgentChip.module.css';

/**
 * Agent profile information for chip display
 */
export type AgentChipData = {
    /**
     * Agent URL (required)
     */
    url: string_url;

    /**
     * Agent display name/label
     */
    label?: string;

    /**
     * Agent profile image URL
     */
    imageUrl?: string_url;

    /**
     * Public URL of the agents server (for generating placeholder images)
     */
    publicUrl?: string_url;
};

/**
 * Props for AgentChip component
 */
export type AgentChipProps = {
    /**
     * Agent data to display
     */
    agent: AgentChipData;

    /**
     * Whether this is an ongoing interaction (shows spinner)
     */
    isOngoing?: boolean;

    /**
     * Whether this is clickable (completed state)
     */
    isClickable?: boolean;

    /**
     * Click handler
     */
    onClick?: (event?: React.MouseEvent) => void;

    /**
     * Additional CSS class name
     */
    className?: string;
};

/**
 * AgentChip component - displays a chip with agent avatar and name
 *
 * This component is used to display agent interactions in chat messages.
 * It fetches the agent profile if needed and displays the agent's avatar and name.
 *
 * @example
 * ```tsx
 * <AgentChip
 *   agent={{ url: 'https://agents.example.com/joe', label: 'Joe' }}
 *   isOngoing={false}
 *   isClickable={true}
 *   onClick={() => console.log('clicked')}
 * />
 * ```
 * 
 * @private utility of `ChatMessageItem` component
 */
export function AgentChip({ agent, isOngoing = false, isClickable = false, onClick, className }: AgentChipProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(() => agent.imageUrl || resolvePlaceholderImageUrl(agent));
    const [agentLabel, setAgentLabel] = useState<string>(() => resolveInitialAgentLabel(agent));

    useEffect(() => {
        let isMounted = true;
        const fallbackLabel = resolveInitialAgentLabel(agent);
        const fallbackImageUrl = agent.imageUrl || resolvePlaceholderImageUrl(agent);

        const fetchAgentProfile = async () => {
            try {
                // Try to fetch agent profile from the URL
                const profileUrl = `${agent.url.replace(/\/$/, '')}/api/profile`;
                const response = await fetch(profileUrl);

                if (response.ok) {
                    const profile = await response.json();
                    if (!isMounted) {
                        return;
                    }

                    // Extract agent name
                    const resolvedLabel = resolvePreferredAgentLabel(
                        [profile.meta?.fullname, profile.agentName, agent.label, extractAgentNameFromUrl(agent.url)],
                        fallbackLabel,
                    );
                    setAgentLabel(resolvedLabel);

                    // Extract image URL
                    const resolvedImageUrl =
                        resolveProfileImageUrl(profile.meta?.image, agent.url, agent.publicUrl) || fallbackImageUrl;

                    setImageUrl(resolvedImageUrl || null);
                } else {
                    // If profile fetch fails, use placeholder
                    if (isMounted) {
                        setAgentLabel(fallbackLabel);
                        setImageUrl(fallbackImageUrl || null);
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch agent profile:', error);
                if (isMounted) {
                    // Use placeholder on error
                    setAgentLabel(fallbackLabel);
                    setImageUrl(fallbackImageUrl || null);
                }
            }
        };

        setAgentLabel(fallbackLabel);
        setImageUrl(fallbackImageUrl || null);

        if (!agent.imageUrl || !agent.label || isLikelyGeneratedId(agent.label)) {
            fetchAgentProfile();
        }

        return () => {
            isMounted = false;
        };
    }, [agent.url, agent.label, agent.imageUrl, agent.publicUrl]);

    const handleClick = (event: React.MouseEvent) => {
        if (isClickable && onClick) {
            onClick(event);
        }
    };

    return (
        <div
            className={`${styles.agentChip} ${isClickable ? styles.clickable : ''} ${className || ''}`}
            onClick={handleClick}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
        >
            {isOngoing && <div className={styles.spinner} />}

            {imageUrl && (
                <div className={styles.avatar}>
                    <img src={imageUrl} alt={agentLabel} className={styles.avatarImage} />
                </div>
            )}

            <span className={styles.label}>{agentLabel}</span>
        </div>
    );
}

/**
 * Extracts agent name from URL
 * Examples:
 * - https://agents.example.com/joe -> joe
 * - https://agents.example.com/agents/joe-green -> joe-green
 */
function extractAgentNameFromUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        return pathParts[pathParts.length - 1] || urlObj.hostname;
    } catch {
        return url;
    }
}

/**
 * Determines whether a label looks like an autogenerated identifier.
 */
function isLikelyGeneratedId(label: string): boolean {
    const trimmed = label.trim();
    if (!trimmed) {
        return false;
    }

    const hasSeparators = /[\s_-]/.test(trimmed);
    const hasDigits = /\d/.test(trimmed);
    const hasMixedCase = /[a-z]/.test(trimmed) && /[A-Z]/.test(trimmed);
    const isLong = trimmed.length >= 12;

    return !hasSeparators && (hasDigits || (hasMixedCase && isLong));
}

/**
 * Resolves the initial label for an agent chip without exposing IDs.
 */
function resolveInitialAgentLabel(agent: AgentChipData): string {
    const candidate = (agent.label || extractAgentNameFromUrl(agent.url)).trim();
    if (!candidate || isLikelyGeneratedId(candidate)) {
        return 'Teammate';
    }

    return candidate;
}

/**
 * Picks the best available label from profile data without exposing IDs.
 */
function resolvePreferredAgentLabel(candidates: Array<string | undefined>, fallback: string): string {
    for (const candidate of candidates) {
        const trimmed = candidate?.trim();
        if (trimmed && !isLikelyGeneratedId(trimmed)) {
            return trimmed;
        }
    }

    return fallback;
}

/**
 * Resolves the agents server base URL from the agent URL or provided public URL.
 */
function resolveAgentsServerUrl(agentUrl: string, publicUrl?: string_url): string | null {
    try {
        if (publicUrl) {
            return new URL(publicUrl).href;
        }

        const url = new URL(agentUrl);
        return `${url.origin}/`;
    } catch {
        return null;
    }
}

/**
 * Resolves the profile image URL, handling relative URLs when needed.
 */
function resolveProfileImageUrl(
    profileImageUrl: string_url | undefined,
    agentUrl: string_url,
    publicUrl?: string_url,
): string | null {
    if (!profileImageUrl) {
        return null;
    }

    if (profileImageUrl.startsWith('http://') || profileImageUrl.startsWith('https://')) {
        return profileImageUrl;
    }

    const baseUrl = resolveAgentsServerUrl(agentUrl, publicUrl);
    if (!baseUrl) {
        return profileImageUrl;
    }

    try {
        return new URL(profileImageUrl, baseUrl).href;
    } catch {
        return profileImageUrl;
    }
}

/**
 * Builds a placeholder image URL for the agent when no profile image is available.
 */
function resolvePlaceholderImageUrl(agent: AgentChipData): string | null {
    const baseUrl = resolveAgentsServerUrl(agent.url, agent.publicUrl);
    if (!baseUrl) {
        return null;
    }

    const agentName = extractAgentNameFromUrl(agent.url);
    return generatePlaceholderAgentProfileImageUrl(agentName, baseUrl);
}
