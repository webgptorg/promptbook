'use client';

import { CSSProperties } from 'react';
import type { AgentBasicInformation } from '../../../book-2.0/agent-source/AgentBasicInformation';
import type { string_book } from '../../../book-2.0/agent-source/string_book';
import type { string_css_class } from '../../../types/typeAliases';
import {
    resolveAgentAvatarFallbackUrl,
    resolveAgentAvatarImageUrl,
} from '../../../utils/agents/resolveAgentAvatarImageUrl';
import { classNames } from '../../_common/react-utils/classNames';
import styles from './AvatarProfile.module.css';

/**
 * Props of `AvatarProfile`
 *
 * @public exported from `@promptbook/components`
 */
export type AvatarProfileProps = {
    /**
     * Agent to be shown
     */
    readonly agent: AgentBasicInformation;

    /**
     * The source of the agent, used to enable profile actions in the UI.
     */
    readonly agentSource?: string_book;

    /**
     * Optional CSS class name which will be added to root <div> element
     */
    readonly className?: string_css_class;

    /**
     * Optional CSS style which will be added to root <div/> element
     */
    readonly style?: CSSProperties;
};

/**
 * Builds the default profile URL for a given agent.
 */
function buildAgentProfileUrl(agent: AgentBasicInformation): string | null {
    const agentId = agent.permanentId || agent.agentName;

    if (!agentId) {
        return null;
    }

    return `/agents/${encodeURIComponent(agentId)}`;
}

/**
 * Shows a box with user avatar, name and description
 *
 * @public exported from `@promptbook/components`
 */
export function AvatarProfile(props: AvatarProfileProps) {
    const { agent, agentSource, className, style } = props;
    const { agentName, personaDescription, meta } = agent;
    const fallbackAvatarUrl = resolveAgentAvatarFallbackUrl({ agent });
    const avatarUrl = resolveAgentAvatarImageUrl({ agent });
    const profileUrl = buildAgentProfileUrl(agent);
    const displayName = meta.fullname || agentName || 'Agent';
    const description = personaDescription?.trim();

    return (
        <div className={classNames(styles.AvatarProfile, className)} style={style}>
            {avatarUrl && (
                <img
                    src={avatarUrl}
                    alt={displayName}
                    className={styles.Avatar}
                    onError={(event) => {
                        if (fallbackAvatarUrl && event.currentTarget.src !== fallbackAvatarUrl) {
                            event.currentTarget.src = fallbackAvatarUrl;
                        }
                    }}
                />
            )}
            <div className={styles.AgentInfo}>
                <h2 className={styles.AgentName}>{displayName}</h2>
                {description && <p className={styles.AgentDescription}>{description}</p>}
                {agentSource !== undefined && profileUrl && (
                    <a
                        className={styles.viewProfileButton}
                        href={profileUrl}
                        onClick={(event) => {
                            event.stopPropagation();
                        }}
                    >
                        View Profile
                    </a>
                )}
            </div>
        </div>
    );
}

/**
 * TODO: [☁️] Export component prop types only to `@promptbook/components` (not `@promptbook/types`)
 */
