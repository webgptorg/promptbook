'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './Chat.module.css';
import type { ChatSoundSystem } from './ChatProps';

/**
 * Props for the ChatSoundToggle component
 */
export type ChatSoundToggleProps = {
    /**
     * The sound system instance
     */
    soundSystem: ChatSoundSystem;

    /**
     * Optional CSS class name
     */
    className?: string;
};

/**
 * ChatSoundToggle component
 *
 * Renders a toggle button/checkbox to enable/disable chat sounds.
 * The state is persisted in localStorage via the SoundSystem.
 *
 * @public exported from `@promptbook/components`
 */
export function ChatSoundToggle(props: ChatSoundToggleProps) {
    const { soundSystem, className } = props;

    const [isEnabled, setIsEnabled] = useState(soundSystem.isEnabled());

    // Sync with soundSystem state
    useEffect(() => {
        setIsEnabled(soundSystem.isEnabled());
    }, [soundSystem]);

    const handleToggle = useCallback(() => {
        const newState = soundSystem.toggle();
        setIsEnabled(newState);
    }, [soundSystem]);

    return (
        <button
            className={className || styles.saveMenuItem}
            onClick={handleToggle}
            title={isEnabled ? 'Disable chat sounds' : 'Enable chat sounds'}
        >
            <span style={{ marginRight: '8px' }}>{isEnabled ? '🔊' : '🔇'}</span>
            <span>{isEnabled ? 'Sounds On' : 'Sounds Off'}</span>
        </button>
    );
}
