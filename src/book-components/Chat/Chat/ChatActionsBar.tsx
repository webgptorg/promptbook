'use client';

import { useCallback, useEffect, useState, type MouseEvent, type MutableRefObject, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Promisable } from 'type-fest';
import { normalizeToKebabCase } from '../../../utils/normalization/normalize-to-kebab-case';
import { classNames } from '../../_common/react-utils/classNames';
import { ResetIcon } from '../../icons/ResetIcon';
import { SaveIcon } from '../../icons/SaveIcon';
import { TemplateIcon } from '../../icons/TemplateIcon';
import { getChatSaveFormatDefinitions } from '../save/_common/getChatSaveFormatDefinitions';
import type { string_chat_format_name } from '../save/_common/string_chat_format_name';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import styles from './Chat.module.css';
import type { ChatSoundSystem } from './ChatProps';
import { ChatSoundToggle } from './ChatSoundToggle';

/**
 * Props for the Chat actions toolbar.
 *
 * @private component of `<Chat/>`
 */
export type ChatActionsBarProps = {
    actionsRef: MutableRefObject<HTMLDivElement | null>;
    actionsContainer?: HTMLElement | null;
    messages: ReadonlyArray<ChatMessage>;
    participants: ReadonlyArray<ChatParticipant>;
    title: string;
    onReset?: () => Promisable<void>;
    onUseTemplate?: () => void;
    extraActions?: ReactNode;
    saveFormats?: Array<string_chat_format_name>;
    isSaveButtonEnabled: boolean;
    shouldFadeActions: boolean;
    onButtonClick: (
        handler?: (event: MouseEvent<HTMLButtonElement>) => void,
    ) => (event: MouseEvent<HTMLButtonElement>) => void;
    soundSystem?: ChatSoundSystem;
};

/**
 * Renders the action buttons row for Chat.
 *
 * @private component of `<Chat/>`
 */
export function ChatActionsBar(props: ChatActionsBarProps) {
    const {
        actionsRef,
        actionsContainer,
        messages,
        participants,
        title,
        onReset,
        onUseTemplate,
        extraActions,
        saveFormats,
        isSaveButtonEnabled,
        shouldFadeActions,
        onButtonClick,
        soundSystem,
    } = props;
    const [showSaveMenu, setShowSaveMenu] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (!(event.ctrlKey || event.metaKey) || event.key !== 's') {
                return;
            }

            event.preventDefault();
            setShowSaveMenu((v) => !v);
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleDownload = useCallback(
        async (format: string_chat_format_name) => {
            const formatDefinition = getChatSaveFormatDefinitions([format])[0];
            if (!formatDefinition) {
                return;
            }

            const date = new Date();
            const dateName = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
                .getDate()
                .toString()
                .padStart(2, '0')}`;

            const content = await formatDefinition.getContent({ title, messages, participants });
            const blob = new Blob([content], { type: formatDefinition.mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${normalizeToKebabCase(title)}-${dateName}.${formatDefinition.fileExtension}`;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);
            setShowSaveMenu(false);
        },
        [messages, participants, title],
    );

    const firstMessageFromUser = messages[0]?.sender === 'USER';
    const actionsAlignmentClass = classNames(styles.actions, firstMessageFromUser ? styles.left : styles.right);

    const actionsContent = (
        <div
            ref={actionsRef}
            className={classNames(
                actionsAlignmentClass,
                actionsContainer && styles.portal,
                shouldFadeActions && styles.actionsFaded,
            )}
        >
            {onReset && messages.length !== 0 && (
                <button
                    className={classNames(styles.chatButton)}
                    onClick={onButtonClick(() => {
                        if (!confirm(`Do you really want to reset the chat?`)) {
                            return;
                        }

                        onReset();
                    })}
                >
                    <ResetIcon />
                    <span className={styles.chatButtonText}>New chat</span>
                </button>
            )}

            {isSaveButtonEnabled && messages.length !== 0 && (
                <div className={styles.saveButtonContainer}>
                    <button
                        className={classNames(styles.chatButton)}
                        onClick={onButtonClick(() => setShowSaveMenu((v) => !v))}
                        aria-haspopup="true"
                        aria-expanded={showSaveMenu}
                    >
                        <SaveIcon size={18} />
                        <span className={styles.chatButtonText}>Save</span>
                    </button>
                    {showSaveMenu && (
                        <div className={styles.saveMenu}>
                            {getChatSaveFormatDefinitions(saveFormats).map((formatDefinition) => (
                                <button
                                    key={formatDefinition.formatName}
                                    className={styles.saveMenuItem}
                                    onClick={() =>
                                        handleDownload(formatDefinition.formatName as string_chat_format_name)
                                    }
                                >
                                    {formatDefinition.label}
                                </button>
                            ))}
                            {soundSystem && (
                                <>
                                    <div className={styles.saveMenuDivider} />
                                    <ChatSoundToggle soundSystem={soundSystem} />
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            {onUseTemplate && (
                <button className={classNames(styles.useTemplateButton)} onClick={onButtonClick(onUseTemplate)}>
                    <span className={styles.chatButtonText}>Use this template</span>
                    <TemplateIcon size={16} />
                </button>
            )}

            {extraActions}
        </div>
    );

    if (actionsContainer) {
        return createPortal(actionsContent, actionsContainer);
    }

    return actionsContent;
}
