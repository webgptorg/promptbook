'use client';

import { useEffect, useState } from 'react';
import type { string_url } from '../../../types/typeAliases';
import {
    loadAgentProfile,
    resolveAgentProfileFallback,
    shouldFetchAgentProfile,
} from '../utils/loadAgentProfile';
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
    const [imageUrl, setImageUrl] = useState<string | null>(() => resolveAgentProfileFallback(agent).imageUrl);
    const [agentLabel, setAgentLabel] = useState<string>(() => resolveAgentProfileFallback(agent).label);

    useEffect(() => {
        let isMounted = true;
        const fallback = resolveAgentProfileFallback(agent);

        setAgentLabel(fallback.label);
        setImageUrl(fallback.imageUrl);

        if (!shouldFetchAgentProfile(agent)) {
            return () => {
                isMounted = false;
            };
        }

        loadAgentProfile(agent).then((profile) => {
            if (!isMounted) {
                return;
            }

            setAgentLabel(profile.label);
            setImageUrl(profile.imageUrl);
        });

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
