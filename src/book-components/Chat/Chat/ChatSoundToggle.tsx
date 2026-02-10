'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './Chat.module.css';
import type { ChatSoundSystem } from './ChatProps';

type ChatSettingToggleButtonProps = {
    readonly className?: string;
    readonly isEnabled: boolean;
    readonly onToggle: () => void;
    readonly iconOn: string;
    readonly iconOff: string;
    readonly labelOn: string;
    readonly labelOff: string;
    readonly titleOn: string;
    readonly titleOff: string;
};

function ChatSettingToggleButton(props: ChatSettingToggleButtonProps) {
    const { className, isEnabled, onToggle, iconOn, iconOff, labelOn, labelOff, titleOn, titleOff } = props;
    const buttonClass = className ?? styles.saveMenuItem;

    return (
        <button className={buttonClass} onClick={onToggle} title={isEnabled ? titleOn : titleOff}>
            <span style={{ marginRight: '8px' }}>{isEnabled ? iconOn : iconOff}</span>
            <span>{isEnabled ? labelOn : labelOff}</span>
        </button>
    );
}

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
        <ChatSettingToggleButton
            className={className}
            isEnabled={isEnabled}
            onToggle={handleToggle}
            iconOn="🔊"
            iconOff="🔇"
            labelOn="Sounds On"
            labelOff="Sounds Off"
            titleOn="Disable chat sounds"
            titleOff="Enable chat sounds"
        />
    );
}

/**
 * Props for the chat vibration toggle.
 */
export type ChatVibrationToggleProps = {
    /**
     * The sound system instance that supports vibration helpers.
     */
    soundSystem: ChatSoundSystem;
    /**
     * Optional CSS class name.
     */
    className?: string;
};

/**
 * ChatVibrationToggle component that controls haptic feedback.
 *
 * @public exported from `@promptbook/components`
 */
export function ChatVibrationToggle(props: ChatVibrationToggleProps) {
    const { soundSystem, className } = props;

    const supportsVibration =
        typeof soundSystem.isVibrationEnabled === 'function' &&
        (typeof soundSystem.toggleVibration === 'function' || typeof soundSystem.setVibrationEnabled === 'function');

    if (!supportsVibration) {
        return null;
    }

    const getCurrentState = () => soundSystem.isVibrationEnabled?.() ?? true;
    const [isEnabled, setIsEnabled] = useState(getCurrentState());

    useEffect(() => {
        setIsEnabled(getCurrentState());
    }, [soundSystem]);

    const handleToggle = useCallback(() => {
        if (typeof soundSystem.toggleVibration === 'function') {
            const nextState = soundSystem.toggleVibration();
            setIsEnabled(nextState);
            return;
        }

        if (soundSystem.isVibrationEnabled && soundSystem.setVibrationEnabled) {
            const nextState = !soundSystem.isVibrationEnabled();
            soundSystem.setVibrationEnabled(nextState);
            setIsEnabled(nextState);
        }
    }, [soundSystem]);

    return (
        <ChatSettingToggleButton
            className={className}
            isEnabled={isEnabled}
            onToggle={handleToggle}
            iconOn="📳"
            iconOff="📴"
            labelOn="Vibration On"
            labelOff="Vibration Off"
            titleOn="Disable vibration feedback"
            titleOff="Enable vibration feedback"
        />
    );
}
