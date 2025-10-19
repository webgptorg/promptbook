// AvatarWithProfile.tsx
import { useState, useRef } from 'react';
import { AvatarProfileFromSource } from '../../AvatarProfile/AvatarProfile/AvatarProfileFromSource';
import styles from './Chat.module.css';

interface AvatarWithProfileProps {
    avatarSrc: string;
    agentSource: string;
    alt?: string;
    size?: number;
}

export function AvatarWithProfile({ avatarSrc, agentSource, alt, size = 40 }: AvatarWithProfileProps) {
    const [showProfile, setShowProfile] = useState(false);
    const avatarRef = useRef<HTMLDivElement>(null);

    return (
        <div
            className={styles.avatarWithProfileContainer}
            onMouseEnter={() => setShowProfile(true)}
            onMouseLeave={() => setShowProfile(false)}
            ref={avatarRef}
            style={{ position: 'relative', display: 'inline-block' }}
        >
            <img
                src={avatarSrc}
                alt={alt}
                width={size}
                height={size}
                style={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(125, 125, 125, 0.1)',
                    aspectRatio: '1 / 1',
                    flexShrink: 0,
                }}
            />
            {showProfile && (
                <div
                    className={styles.avatarProfilePopover}
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 100,
                        minWidth: 220,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        background: '#fff',
                        borderRadius: 8,
                        padding: 12,
                    }}
                >
                    <AvatarProfileFromSource agentSource={agentSource} />
                </div>
            )}
        </div>
    );
}
