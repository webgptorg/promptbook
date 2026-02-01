'use client';

import { type CSSProperties, type ReactNode } from 'react';
import { classNames } from '../../_common/react-utils/classNames';
import styles from './Chat.module.css';

/**
 * Props for a team modal header profile badge.
 *
 * @private component of `<Chat/>`
 */
export type TeamHeaderProfileProps = {
    label: string;
    avatarSrc?: string | null;
    href?: string;
    fallbackColor?: string;
};

/**
 * Renders a profile badge used in the TEAM modal header.
 *
 * @private component of `<Chat/>`
 */
export function TeamHeaderProfile({ label, avatarSrc, href, fallbackColor }: TeamHeaderProfileProps) {
    const avatarStyles: CSSProperties = {
        backgroundColor: fallbackColor || '#e2e8f0',
        backgroundImage: avatarSrc ? `url(${avatarSrc})` : undefined,
    };

    const content = (
        <>
            <span className={styles.teamHeaderAvatar} style={avatarStyles} aria-hidden="true" />
            <span className={styles.teamHeaderName}>{label}</span>
        </>
    );

    if (href) {
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={classNames(styles.teamHeaderProfile, styles.teamHeaderProfileLink)}
            >
                {content}
            </a>
        );
    }

    return <div className={styles.teamHeaderProfile}>{content}</div>;
}

/**
 * Props for a self-learning modal avatar.
 *
 * @private component of `<Chat/>`
 */
export type SelfLearningAvatarProps = {
    label: string;
    avatarSrc?: string | null;
    fallbackColor?: string;
    className?: string;
    children?: ReactNode;
};

/**
 * Renders an avatar badge for the self-learning modal header.
 *
 * @private component of `<Chat/>`
 */
export function SelfLearningAvatar({
    label,
    avatarSrc,
    fallbackColor = '#e2e8f0',
    className,
    children,
}: SelfLearningAvatarProps) {
    const avatarStyle: CSSProperties = {
        backgroundColor: fallbackColor,
        backgroundImage: avatarSrc ? `url(${avatarSrc})` : undefined,
    };

    const initial = label.trim().charAt(0).toUpperCase() || '?';

    return (
        <div
            className={classNames(styles.selfLearningAvatar, className)}
            style={avatarStyle}
            role="img"
            aria-label={label}
            title={label}
        >
            {!avatarSrc && (children || <span className={styles.selfLearningAvatarInitial}>{initial}</span>)}
        </div>
    );
}

/**
 * Note: [💞] Ignore a discrepancy between file name and entity name, BUT maybe split to multiple files
 */
