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
 */
export function AgentChip({ agent, isOngoing = false, isClickable = false, onClick, className }: AgentChipProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [agentLabel, setAgentLabel] = useState<string>(agent.label || extractAgentNameFromUrl(agent.url));

    useEffect(() => {
        let isMounted = true;

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
                    const name = profile.meta?.fullname || profile.agentName || agent.label;
                    setAgentLabel(name);

                    // Extract image URL
                    let profileImageUrl = profile.meta?.image;

                    // If the image URL is relative, make it absolute
                    if (profileImageUrl && !profileImageUrl.startsWith('http')) {
                        const baseUrl = agent.url.replace(/\/$/, '');
                        profileImageUrl = `${baseUrl}${profileImageUrl.startsWith('/') ? '' : '/'}${profileImageUrl}`;
                    }

                    setImageUrl(profileImageUrl || null);
                } else {
                    // If profile fetch fails, use placeholder
                    if (isMounted) {
                        const placeholderUrl = generatePlaceholderAgentProfileImageUrl(
                            agent.url,
                            agent.publicUrl || agent.url,
                        );
                        setImageUrl(placeholderUrl);
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch agent profile:', error);
                if (isMounted) {
                    // Use placeholder on error
                    const placeholderUrl = generatePlaceholderAgentProfileImageUrl(
                        agent.url,
                        agent.publicUrl || agent.url,
                    );
                    setImageUrl(placeholderUrl);
                }
            }
        };

        // If image URL is already provided, use it
        if (agent.imageUrl) {
            setImageUrl(agent.imageUrl);
        } else {
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={agentLabel} className={styles.avatarImage} />
                </div>
            )}

            <span className={styles.label}>
                {isOngoing && '🤝 '}
                {agentLabel}
                {isOngoing && '...'}
            </span>
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
