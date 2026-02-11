'use client';

import { useCallback, useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { Volume2Icon, VolumeXIcon, VibrateIcon, VibrateOffIcon } from 'lucide-react';
import styles from './Chat.module.css';
import type { ChatSoundSystem } from './ChatProps';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function useSoundSystemToggle(getState: () => boolean, toggleState: () => boolean) {
    const [isEnabled, setIsEnabled] = useState(() => getState());

    useEffect(() => {
        setIsEnabled(getState());
    }, [getState]);

    const handleToggle = useCallback(() => {
        const next = toggleState();
        setIsEnabled(next);
        return next;
    }, [toggleState]);

    return { isEnabled, handleToggle };
}

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

    const getSoundEnabled = useCallback(() => soundSystem.isEnabled(), [soundSystem]);
    const toggleSound = useCallback(() => soundSystem.toggle(), [soundSystem]);
    const { isEnabled, handleToggle } = useSoundSystemToggle(getSoundEnabled, toggleSound);

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

    const getCurrentState = useCallback(() => soundSystem.isVibrationEnabled?.() ?? true, [soundSystem]);
    const toggleVibration = useCallback(() => {
        if (typeof soundSystem.toggleVibration === 'function') {
            return soundSystem.toggleVibration();
        }

        if (
            typeof soundSystem.isVibrationEnabled === 'function' &&
            typeof soundSystem.setVibrationEnabled === 'function'
        ) {
            const nextState = !soundSystem.isVibrationEnabled();
            soundSystem.setVibrationEnabled(nextState);
            return nextState;
        }

        return getCurrentState();
    }, [soundSystem, getCurrentState]);

    const { isEnabled, handleToggle } = useSoundSystemToggle(getCurrentState, toggleVibration);

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

type FeedbackToggleButtonProps = {
    readonly label: string;
    readonly description: string;
    readonly stateLabel: string;
    readonly isEnabled: boolean;
    readonly onToggle: () => void;
    readonly title: string;
    readonly IconOn: IconComponent;
    readonly IconOff: IconComponent;
};

function FeedbackToggleButton(props: FeedbackToggleButtonProps) {
    const { label, description, stateLabel, isEnabled, onToggle, title, IconOn, IconOff } = props;
    const Icon = isEnabled ? IconOn : IconOff;

    return (
        <button
            type="button"
            className={styles.chatFeedbackToggle}
            onClick={onToggle}
            title={title}
            aria-pressed={isEnabled}
            data-enabled={isEnabled ? 'true' : 'false'}
        >
            <span className={styles.chatFeedbackIcon}>
                <Icon aria-hidden="true" />
            </span>
            <div className={styles.chatFeedbackMeta}>
                <span className={styles.chatFeedbackLabel}>{label}</span>
                <span className={styles.chatFeedbackDescription}>{description}</span>
            </div>
            <span
                className={`${styles.chatFeedbackIndicator} ${
                    isEnabled ? styles.chatFeedbackIndicatorActive : styles.chatFeedbackIndicatorInactive
                }`}
            >
                {stateLabel}
            </span>
        </button>
    );
}

/**
 * Props for the combined sound and vibration control panel.
 */
export type ChatSoundAndVibrationPanelProps = {
    readonly soundSystem: ChatSoundSystem;
};

/**
 * Renders a compact control panel that surfaces both sound and haptic toggles with richer affordances.
 *
 * @public exported from `@promptbook/components`
 */
export function ChatSoundAndVibrationPanel(props: ChatSoundAndVibrationPanelProps) {
    const { soundSystem } = props;

    const getSoundEnabled = useCallback(() => soundSystem.isEnabled(), [soundSystem]);
    const toggleSound = useCallback(() => soundSystem.toggle(), [soundSystem]);
    const soundState = useSoundSystemToggle(getSoundEnabled, toggleSound);

    const supportsVibration =
        typeof soundSystem.isVibrationEnabled === 'function' &&
        (typeof soundSystem.toggleVibration === 'function' || typeof soundSystem.setVibrationEnabled === 'function');

    const getVibrationState = useCallback(() => soundSystem.isVibrationEnabled?.() ?? true, [soundSystem]);
    const toggleVibration = useCallback(() => {
        if (typeof soundSystem.toggleVibration === 'function') {
            return soundSystem.toggleVibration();
        }

        if (
            typeof soundSystem.isVibrationEnabled === 'function' &&
            typeof soundSystem.setVibrationEnabled === 'function'
        ) {
            const nextState = !soundSystem.isVibrationEnabled();
            soundSystem.setVibrationEnabled(nextState);
            return nextState;
        }

        return getVibrationState();
    }, [soundSystem, getVibrationState]);

    const vibrationState = useSoundSystemToggle(getVibrationState, toggleVibration);

    return (
        <div className={styles.chatFeedbackPanel} role="group" aria-label="Sound and vibration controls">
            <FeedbackToggleButton
                label="Sounds"
                description={soundState.isEnabled ? 'Audio cues and timers stay audible' : 'Muted to keep focus'}
                stateLabel={soundState.isEnabled ? 'On' : 'Off'}
                isEnabled={soundState.isEnabled}
                onToggle={soundState.handleToggle}
                title={soundState.isEnabled ? 'Disable chat sounds' : 'Enable chat sounds'}
                IconOn={Volume2Icon}
                IconOff={VolumeXIcon}
            />
            {supportsVibration && (
                <FeedbackToggleButton
                    label="Vibration"
                    description={
                        vibrationState.isEnabled
                            ? 'Haptic feedback for tokens and interactions'
                            : 'Haptics are silenced'
                    }
                    stateLabel={vibrationState.isEnabled ? 'On' : 'Off'}
                    isEnabled={vibrationState.isEnabled}
                    onToggle={vibrationState.handleToggle}
                    title={vibrationState.isEnabled ? 'Disable vibration feedback' : 'Enable vibration feedback'}
                    IconOn={VibrateIcon}
                    IconOff={VibrateOffIcon}
                />
            )}
        </div>
    );
}
