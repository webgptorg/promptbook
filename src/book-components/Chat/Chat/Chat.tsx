'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import moment from 'moment';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import spaceTrim from 'spacetrim';
import { USER_CHAT_COLOR } from '../../../config';
import { SpeechRecognitionEvent, SpeechRecognitionState } from '../../../types/SpeechRecognition';
import type { id } from '../../../types/typeAliases';
import { Color } from '../../../utils/color/Color';
import { textColor } from '../../../utils/color/operators/furthest';
import { grayscale } from '../../../utils/color/operators/grayscale';
import { lighten } from '../../../utils/color/operators/lighten';
import { countLines } from '../../../utils/expectation-counters/countLines';
import { humanizeAiText } from '../../../utils/markdown/humanizeAiText';
import { promptbookifyAiText } from '../../../utils/markdown/promptbookifyAiText';
import { normalizeToKebabCase } from '../../../utils/normalization/normalize-to-kebab-case';
import type { TODO_any } from '../../../utils/organization/TODO_any';
import { classNames } from '../../_common/react-utils/classNames';
import { ArrowIcon } from '../../icons/ArrowIcon';
import { AttachmentIcon } from '../../icons/AttachmentIcon';
import { CloseIcon } from '../../icons/CloseIcon';
import { EmailIcon } from '../../icons/EmailIcon';
import { MicIcon } from '../../icons/MicIcon';
import { ResetIcon } from '../../icons/ResetIcon';
import { SaveIcon } from '../../icons/SaveIcon';
import { SendIcon } from '../../icons/SendIcon';
import { TemplateIcon } from '../../icons/TemplateIcon';
import { ChatEffectsSystem } from '../effects/ChatEffectsSystem';
import type { ChatEffectConfig } from '../effects/types/ChatEffectConfig';
import { useChatAutoScroll } from '../hooks/useChatAutoScroll';
import { MarkdownContent } from '../MarkdownContent/MarkdownContent';
import { FAST_FLOW } from '../MockedChat/constants';
import { MockedChat } from '../MockedChat/MockedChat'; // <- [🥂]
import { getChatSaveFormatDefinitions } from '../save/_common/getChatSaveFormatDefinitions';
import type { string_chat_format_name } from '../save/_common/string_chat_format_name';
import type { ChatMessage } from '../types/ChatMessage';
import type { ParsedCitation } from '../utils/parseCitationsFromContent';
import {
    extractSearchResults,
    getToolCallResultDate,
    getToolCallTimestamp,
    parseTeamToolResult,
    parseToolCallArguments,
    parseToolCallResult,
} from '../utils/toolCallParsing';
import styles from './Chat.module.css';
import { ChatMessageItem } from './ChatMessageItem';
import type { ChatProps } from './ChatProps';
import { ChatSoundToggle } from './ChatSoundToggle';
import { ClockIcon } from './ClockIcon';

/**
 * Renders a chat with messages and input for new messages
 *
 * Note: 🔇 This component does NOT have speak functionality, it just allows to trigger voice recognition
 *
 * Note: There are multiple chat components:
 * - `<Chat/>` renders chat as it is without any logic
 * - `<LlmChat/>` connected to LLM Execution Tools of Promptbook
 *
 * Use <WorkerChat/> or <SignalChat/> in most cases.
 *
 * @public exported from `@promptbook/components`
 */
export function Chat(props: ChatProps) {
    const {
        title = 'Chat',
        messages,
        onChange,
        onMessage,
        onReset,
        onFeedback,
        onFileUpload,
        speechRecognition,
        // isVoiceRecognitionButtonShown,
        // voiceLanguage = 'en-US',
        placeholderMessageContent,
        defaultMessage,
        // tasksProgress,
        children,
        className,
        style,
        // voiceCallProps,
        isAiTextHumanizedAndPromptbookified = true,
        isVoiceCalling = false,
        isFocusedOnLoad,
        // isExperimental = false,
        // TODO: [😅]> isSaveButtonEnabled = false,
        // exportHeaderMarkdown,
        participants = [],
        extraActions,
        actionsContainer,
        saveFormats,
        isSaveButtonEnabled = true,
        isCopyButtonEnabled = true,
        buttonColor: buttonColorRaw,
        onUseTemplate,
        onCreateAgent,
        toolTitles,
        teammates,
        visual,
        effectConfigs,
        soundSystem,
    } = props;

    const buttonColor = useMemo(() => Color.from(buttonColorRaw || '#0066cc'), [buttonColorRaw]);

    // Use the auto-scroll hook
    const {
        isAutoScrolling,
        chatMessagesRef,
        handleScroll,
        handleMessagesChange,
        scrollToBottom,
        isMobile: isMobileFromHook,
    } = useChatAutoScroll();

    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const buttonSendRef = useRef<HTMLButtonElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [ratingModalOpen, setRatingModalOpen] = useState(false);
    const [toolCallModalOpen, setToolCallModalOpen] = useState(false);
    const [selectedToolCall, setSelectedToolCall] = useState<NonNullable<ChatMessage['toolCalls']>[number] | null>(
        null,
    );
    const [citationModalOpen, setCitationModalOpen] = useState(false);
    const [selectedCitation, setSelectedCitation] = useState<ParsedCitation | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
    const [messageRatings, setMessageRatings] = useState<Map<id, number>>(new Map());
    const [textRating, setTextRating] = useState('');
    const [hoveredRating, setHoveredRating] = useState(0);
    const [expandedMessageId, setExpandedMessageId] = useState<id | null>(null);
    // const [copiedToClipboard, setCopiedToClipboard] = useState(false);
    // const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    // const [isTyping, setIsTyping] = useState(false);
    // const [inputValue, setInputValue] = useState('');
    const [mode] = useState<'LIGHT' | 'DARK'>('LIGHT'); // Simplified light/dark mode
    const [ratingConfirmation, setRatingConfirmation] = useState<string | null>(null);

    // File upload state
    const [uploadedFiles, setUploadedFiles] = useState<Array<{ id: string; file: File; content: string }>>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Voice recognition state
    const [speechRecognitionState, setSpeechRecognitionState] = useState<SpeechRecognitionState>('IDLE');

    // Use mobile detection from the hook
    const isMobile = isMobileFromHook;

    useEffect(
        (/* Focus textarea on page load */) => {
            if (!textareaRef.current) {
                return;
            }

            // Note: By default, only auto-focus on desktop to prevent mobile keyboard from popping up
            const isFocused = isFocusedOnLoad ?? !isMobile;

            if (isFocused) {
                textareaRef.current.focus();
            }
        },
        [textareaRef, isMobile, isFocusedOnLoad],
    );

    // Voice recognition effects
    useEffect(() => {
        if (!speechRecognition) {
            return;
        }

        const unsubscribe = speechRecognition.subscribe((event: SpeechRecognitionEvent) => {
            if (event.type === 'START') {
                setSpeechRecognitionState('RECORDING');
            } else if (event.type === 'RESULT') {
                // [🧠] Note: This logic assumes that interim results are being updated.
                //      For OpenAiSpeechRecognition, it's just one final result.

                if (textareaRef.current) {
                    const textarea = textareaRef.current;
                    const currentValue = textarea.value;

                    // Append the transcribed text with a space if needed
                    const separator =
                        currentValue && !currentValue.endsWith(' ') && !currentValue.endsWith('\n') ? ' ' : '';
                    textarea.value += separator + event.text;

                    if (onChange) {
                        onChange(textarea.value);
                    }
                }
            } else if (event.type === 'ERROR') {
                setSpeechRecognitionState('ERROR');
                alert(`Speech recognition error: ${event.message}`);
            } else if (event.type === 'STOP') {
                setSpeechRecognitionState('IDLE');
            }
        });

        return () => {
            unsubscribe();
        };
    }, [speechRecognition, onChange]);

    const handleToggleVoiceInput = useCallback(() => {
        if (!speechRecognition) {
            return;
        }

        if (speechRecognition.state === 'IDLE' || speechRecognition.state === 'ERROR') {
            speechRecognition.$start({ language: /* 'en-US' */ 'en' });
        } else {
            speechRecognition.$stop();
        }
    }, [speechRecognition]);

    // File upload handlers inspired by BookEditor
    const handleFileUpload = useCallback(
        async (files: FileList | File[]) => {
            if (!onFileUpload) return;

            setIsUploading(true);
            const fileArray = Array.from(files);

            try {
                // Process files one by one as specified in requirements
                const newUploadedFiles: Array<{ id: string; file: File; content: string }> = [];
                for (const file of fileArray) {
                    const content = await onFileUpload(file);
                    newUploadedFiles.push({
                        id: Math.random().toString(36).substring(2),
                        file,
                        content,
                    });
                }

                setUploadedFiles((prev) => [...prev, ...newUploadedFiles]);
            } catch (error) {
                console.error('File upload failed:', error);
                alert('File upload failed. Please try again.');
            } finally {
                setIsUploading(false);
            }
        },
        [onFileUpload, onChange],
    );

    const handleDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            setIsDragOver(false);

            if (!onFileUpload) return;

            const files = event.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files);
            }
        },
        [onFileUpload, handleFileUpload],
    );

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        setIsDragOver(false);
    }, []);

    const handlePaste = useCallback(
        (event: React.ClipboardEvent) => {
            if (!onFileUpload) return;

            const files = event.clipboardData.files;
            if (files.length > 0) {
                // event.preventDefault(); // [🧠] Do NOT prevent default, because we want to allow pasting text too
                handleFileUpload(files);
            }
        },
        [onFileUpload, handleFileUpload],
    );

    const handleFileInputChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (files && files.length > 0) {
                handleFileUpload(files);
            }
            // Reset input value so same file can be selected again
            event.target.value = '';
        },
        [handleFileUpload],
    );

    const removeUploadedFile = useCallback((fileId: string) => {
        setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
    }, []);

    const handleSend = useCallback(async () => {
        if (!onMessage) {
            throw new Error(`Can not find onMessage callback`);
        }

        const textareaElement = textareaRef.current;
        const buttonSendElement = buttonSendRef.current;

        if (!textareaElement) {
            throw new Error(`Can not find textarea`);
        }
        if (!buttonSendElement) {
            throw new Error(`Can not find textarea`);
        }

        // Check if textarea was focused before sending to preserve focus only in that case
        const wasTextareaFocused = document.activeElement === textareaElement;

        textareaElement.disabled = true;
        buttonSendElement.disabled = true;

        try {
            const messageContent = textareaElement.value;
            const attachments = uploadedFiles.map((uploadedFile) => ({
                name: uploadedFile.file.name,
                type: uploadedFile.file.type,
                url: uploadedFile.content,
            }));

            if (spaceTrim(messageContent) === '' && attachments.length === 0) {
                throw new Error(`You need to write some text or upload a file`);
            }

            // Play send sound
            if (soundSystem) {
                /* not await */ soundSystem.play('message_send');
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (onMessage as any)(messageContent, attachments);

            textareaElement.value = '';
            setUploadedFiles([]); // Clear uploaded files after sending

            // Only restore focus if the textarea was focused when sending the message
            if (wasTextareaFocused) {
                textareaElement.focus();
            }
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            console.error(error);
            alert(error.message);
        } finally {
            textareaElement.disabled = false;
            buttonSendElement.disabled = false;

            // Only restore focus if the textarea was focused when sending the message
            if (wasTextareaFocused) {
                textareaElement.focus();
            }
        }
    }, [onMessage, uploadedFiles]);

    const useChatCssClassName = (suffix: string) => `chat-${suffix}`;

    const scrollToBottomCssClassName = useChatCssClassName('scrollToBottom');

    // Helper to play button click sound
    const handleButtonClick = useCallback(
        (originalHandler?: (event: React.MouseEvent<HTMLButtonElement>) => void) => {
            return (event: React.MouseEvent<HTMLButtonElement>) => {
                if (soundSystem) {
                    /* not await */ soundSystem.play('button_click');
                }
                if (originalHandler) {
                    originalHandler(event);
                }
            };
        },
        [soundSystem],
    );

    const handleRating = useCallback(async (message: ChatMessage, newRating: number) => {
        setSelectedMessage(message);
        setMessageRatings((previousRatings) => {
            const nextRatings = new Map(previousRatings);
            nextRatings.set(
                message.id || message.content /* <- TODO: [🧠][💃] Is `message.content` good replacement for the ID */,
                newRating,
            );
            return nextRatings;
        });
        setRatingModalOpen(true);
    }, []);

    const submitRating = useCallback(async () => {
        if (!selectedMessage) return;
        const currentRating = messageRatings.get(selectedMessage.id || selectedMessage.content /* <-[💃] */);
        if (!currentRating) return;

        // Build chatThread: all messages separated by \n\n---\n\n
        const chatThread = messages.map((msg) => `${msg.content}`).join('\n\n---\n\n');

        const feedbackData = {
            message: selectedMessage,
            rating: currentRating,
            textRating: textRating,
            chatThread,
            expectedAnswer: selectedMessage.expectedAnswer || selectedMessage.content || null,
            url: window.location.href,
        };

        // If onFeedback callback is provided, use it; otherwise, log to console
        if (onFeedback) {
            try {
                await onFeedback(feedbackData);
            } catch (error) {
                console.error('Error submitting feedback:', error);
                alert('Failed to submit feedback. Please try again.');
                return;
            }
        } else {
            console.info('Rating submitted:', {
                rating: '⭐'.repeat(currentRating),
                textRating: textRating,
                chatThread,
                expectedAnswer: selectedMessage.expectedAnswer || selectedMessage.content || null,
                url: window.location.href,
            });
        }

        setRatingModalOpen(false);
        setTextRating('');
        setSelectedMessage(null);
        setRatingConfirmation('Thank you for your feedback!');
        setTimeout(() => setRatingConfirmation(null), 3000);
    }, [selectedMessage, messageRatings, textRating, messages, onFeedback]);

    // Prevent body scroll when modal is open (mobile)
    useEffect(() => {
        if (ratingModalOpen && isMobile) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [ratingModalOpen, isMobile]);

    // Determine alignment for actions (Reset button) based on the first message
    const firstMessageFromUser = messages[0]?.sender === 'USER';
    const actionsAlignmentClass = firstMessageFromUser
        ? styles.actions + ' ' + styles.left
        : styles.actions + ' ' + styles.right;

    const postprocessedMessages = useMemo<ReadonlyArray<ChatMessage>>(() => {
        if (!isAiTextHumanizedAndPromptbookified) {
            return messages;
        }

        return messages.map((message) => {
            return { ...message, content: promptbookifyAiText(humanizeAiText(message.content)) };
        });
    }, [messages, isAiTextHumanizedAndPromptbookified]);

    // Trigger auto-scroll when messages change
    useEffect(() => {
        handleMessagesChange();
    }, [postprocessedMessages, handleMessagesChange]);

    // Track previous messages to detect new ones
    const previousMessagesLengthRef = useRef(messages.length);

    // Play sounds when new messages are received or typing indicator appears
    useEffect(() => {
        if (!soundSystem || messages.length === 0) {
            return;
        }

        const lastMessage = messages[messages.length - 1];
        if (!lastMessage) {
            return;
        }

        // Only trigger sounds for new messages (not on initial render)
        if (messages.length > previousMessagesLengthRef.current) {
            // Message from agent/assistant
            if (lastMessage.sender !== 'USER') {
                if (lastMessage.isComplete) {
                    // Complete message - play receive sound
                    /* not await */ soundSystem.play('message_receive');
                } else if (lastMessage.content.includes('Thinking...') || lastMessage.content.includes('typing')) {
                    // Typing indicator - play typing sound
                    /* not await */ soundSystem.play('message_typing');
                }
            }
        } else if (messages.length === previousMessagesLengthRef.current && lastMessage.sender !== 'USER') {
            // Message length same but content changed - check for completion
            if (lastMessage.isComplete && !lastMessage.content.includes('Thinking...')) {
                // Message just became complete - play receive sound
                /* not await */ soundSystem.play('message_receive');
            }
        }

        previousMessagesLengthRef.current = messages.length;
    }, [messages, soundSystem]);

    // Download logic
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
    }, [setShowSaveMenu]);

    const handleDownload = useCallback(
        async (format: string_chat_format_name) => {
            const formatDefinition = getChatSaveFormatDefinitions([format])[0];
            if (!formatDefinition) return;

            const date = new Date();
            const dateName = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
                .getDate()
                .toString()
                .padStart(2, '0')}`;

            const content = await formatDefinition.getContent({ title, messages, participants });
            const blob = new Blob([content], { type: formatDefinition.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${normalizeToKebabCase(title)}-${dateName}.${formatDefinition.fileExtension}`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            setShowSaveMenu(false);
        },
        [messages],
    );

    const isFeedbackEnabled = !!onFeedback;

    // Handler for copy button
    const handleCopy = () => {};

    return (
        <>
            {ratingConfirmation && <div className={styles.ratingConfirmation}>{ratingConfirmation}</div>}

            {effectConfigs && effectConfigs.length > 0 && (
                <ChatEffectsSystem
                    messages={postprocessedMessages}
                    effectConfigs={effectConfigs as ReadonlyArray<ChatEffectConfig>}
                    soundSystem={soundSystem}
                />
            )}

            <div
                className={classNames(
                    className,
                    styles.Chat,
                    visual === 'STANDALONE' && styles.standaloneVisual,
                    visual === 'FULL_PAGE' && styles.fullPageVisual,
                    useChatCssClassName('Chat'),
                )}
                {...{ style }}
            >
                <div className={classNames(className, styles.chatMainFlow, useChatCssClassName('chatMainFlow'))}>
                    {children && <div className={classNames(styles.chatChildren)}>{children}</div>}

                    {!isAutoScrolling && (
                        <div className={styles.scrollToBottomContainer}>
                            <button
                                data-button-type="custom"
                                className={classNames(styles.scrollToBottom, scrollToBottomCssClassName)}
                                onClick={handleButtonClick(scrollToBottom)}
                            >
                                <ArrowIcon direction="DOWN" size={33} />
                            </button>
                        </div>
                    )}

                    {isVoiceCalling && (
                        <div className={styles.voiceCallIndicatorBar}>
                            <div className={styles.voiceCallIndicator}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                </svg>
                                <span>Voice call active</span>
                                <div className={styles.voiceCallPulse}></div>
                            </div>
                        </div>
                    )}

                    {(() => {
                        const actionsContent = (
                            <div className={classNames(actionsAlignmentClass, actionsContainer && styles.portal)}>
                                {onReset && postprocessedMessages.length !== 0 && (
                                    <button
                                        className={classNames(styles.chatButton)}
                                        onClick={handleButtonClick(() => {
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

                                {isSaveButtonEnabled && postprocessedMessages.length !== 0 && (
                                    <div className={styles.saveButtonContainer}>
                                        <button
                                            className={classNames(styles.chatButton)}
                                            onClick={handleButtonClick(() => setShowSaveMenu((v) => !v))}
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
                                                            // TODO: !!! Use here `$induceFileDownload`
                                                            handleDownload(
                                                                formatDefinition.formatName as string_chat_format_name,
                                                            )
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
                                    <button
                                        className={classNames(styles.useTemplateButton)}
                                        onClick={handleButtonClick(onUseTemplate)}
                                    >
                                        <span className={styles.chatButtonText}>Use this template</span>
                                        <TemplateIcon size={16} />
                                    </button>
                                )}

                                {/* Extra custom action buttons (e.g. Pause/Resume for MockedChat) */}
                                {extraActions}
                            </div>
                        );

                        if (actionsContainer) {
                            return createPortal(actionsContent, actionsContainer);
                        }

                        return actionsContent;
                    })()}

                    <div
                        className={classNames(
                            styles.chatMessages,
                            useChatCssClassName('chatMessages'),
                            (() => {
                                // Detect if actions are present
                                const hasActions =
                                    (!!onReset && postprocessedMessages.length !== 0) ||
                                    (isSaveButtonEnabled && postprocessedMessages.length !== 0) ||
                                    !!onUseTemplate ||
                                    !!extraActions;

                                if (!hasActions) {
                                    return false;
                                }

                                // Detect if first message is long
                                const firstMsg = postprocessedMessages[0];
                                const firstMsgContent = firstMsg?.content || '';
                                const firstMsgLines = firstMsgContent.split('\n').length; // <- TODO: Maybe use official counting functions here
                                const firstMsgChars = firstMsgContent.length;
                                const isFirstLong = firstMsgLines > 5 || firstMsgChars > 50;

                                if (!isFirstLong) {
                                    return false;
                                }

                                return true;
                            })() && styles.hasActionsAndFirstMessageIsLong,
                        )}
                        ref={chatMessagesRef}
                        onScroll={handleScroll}
                    >
                        {postprocessedMessages.map((message, i) => {
                            const participant = participants.find((participant) => participant.name === message.sender);
                            const isLastMessage = i === postprocessedMessages.length - 1;
                            const isExpanded = expandedMessageId === message.id;
                            const currentRating = messageRatings.get(message.id || message.content /* <-[💃] */) || 0;

                            return (
                                <ChatMessageItem
                                    key={message.id}
                                    message={message}
                                    participant={participant}
                                    participants={participants}
                                    isLastMessage={isLastMessage}
                                    onMessage={onMessage}
                                    setExpandedMessageId={setExpandedMessageId}
                                    isExpanded={isExpanded}
                                    currentRating={currentRating}
                                    handleRating={handleRating}
                                    mode={mode}
                                    isCopyButtonEnabled={isCopyButtonEnabled}
                                    isFeedbackEnabled={isFeedbackEnabled}
                                    onCopy={handleCopy}
                                    onCreateAgent={onCreateAgent}
                                    toolTitles={toolTitles}
                                    teammates={teammates}
                                    onToolCallClick={(toolCall) => {
                                        setSelectedToolCall(toolCall);
                                        setToolCallModalOpen(true);
                                    }}
                                    onCitationClick={(citation) => {
                                        setSelectedCitation(citation);
                                        setCitationModalOpen(true);
                                    }}
                                />
                            );
                        })}

                        <div
                            // Note: Extra space at bottom for input area
                            style={{ height: 100 }}
                        ></div>
                    </div>

                    {onMessage && (
                        <div
                            className={classNames(
                                styles.chatInput,
                                useChatCssClassName('chatInput'),
                                isDragOver && styles.dragOver,
                            )}
                            {...(onFileUpload
                                ? {
                                      onDrop: handleDrop,
                                      onDragOver: handleDragOver,
                                      onDragLeave: handleDragLeave,
                                  }
                                : {})}
                        >
                            {/* File previews */}
                            {uploadedFiles.length > 0 && (
                                <div className={styles.filePreviewContainer}>
                                    {uploadedFiles.map((uploadedFile) => (
                                        <div key={uploadedFile.id} className={styles.filePreview}>
                                            <div className={styles.fileIcon}>📎</div>
                                            <div className={styles.fileInfo}>
                                                <div className={styles.fileName}>{uploadedFile.file.name}</div>
                                                <div className={styles.fileSize}>
                                                    {(uploadedFile.file.size / 1024).toFixed(1)} KB
                                                </div>
                                            </div>
                                            <button
                                                className={styles.removeFileButton}
                                                onClick={() => removeUploadedFile(uploadedFile.id)}
                                                title="Remove file"
                                            >
                                                <CloseIcon /* !!! size={12}*/ />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {(() => {
                                // Note: Find the isMe participant or fallback to default
                                const myColor = participants.find((p) => p.isMe)?.color || USER_CHAT_COLOR;

                                const inputBgColor = Color.from(myColor).then(lighten(0.4)).then(grayscale(0.7));
                                const inputTextColor = inputBgColor.then(textColor);
                                return (
                                    <div
                                        className={styles.inputContainer}
                                        style={
                                            {
                                                // Use a high-contrast placeholder color for visibility
                                                '--chat-placeholder-color': '#fff',
                                                // <- TODO: Remove
                                                '--input-bg-color': inputBgColor.toHex(),
                                                '--input-text-color': inputTextColor.toHex(),
                                                '--brand-color': buttonColor.toHex(),
                                            } as React.CSSProperties
                                        }
                                    >
                                        <textarea
                                            ref={(element) => {
                                                textareaRef.current = element;
                                            }}
                                            onPaste={handlePaste}
                                            style={{
                                                height:
                                                    Math.max(
                                                        countLines(textareaRef.current?.value || defaultMessage || ''),
                                                        (textareaRef.current?.value || defaultMessage || '').split('\n')
                                                            .length,
                                                        3,
                                                    ) *
                                                        25 +
                                                    10,
                                            }}
                                            defaultValue={defaultMessage}
                                            placeholder={placeholderMessageContent || 'Write a message...'}
                                            onKeyDown={(event) => {
                                                if (!onMessage) {
                                                    return;
                                                }
                                                if (event.shiftKey) {
                                                    return;
                                                }
                                                if (event.key !== 'Enter') {
                                                    return;
                                                }

                                                event.preventDefault();
                                                /* not await */ handleSend();
                                            }}
                                            onKeyUp={() => {
                                                if (!onChange) {
                                                    return;
                                                }

                                                onChange(textareaRef.current?.value || '');
                                            }}
                                        />

                                        {/* File upload button */}
                                        {onFileUpload && (
                                            <>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    multiple
                                                    style={{ display: 'none' }}
                                                    onChange={handleFileInputChange}
                                                />
                                                <button
                                                    type="button"
                                                    style={{
                                                        backgroundColor: buttonColor.toHex(),
                                                        color: buttonColor.then(textColor).toHex(),
                                                    }}
                                                    className={styles.attachmentButton}
                                                    onClick={handleButtonClick(() => fileInputRef.current?.click())}
                                                    disabled={isUploading}
                                                    title="Attach file"
                                                >
                                                    <AttachmentIcon size={20} />
                                                </button>
                                            </>
                                        )}

                                        {speechRecognition && (
                                            <button
                                                data-button-type="voice"
                                                disabled={
                                                    speechRecognitionState === 'STARTING' ||
                                                    speechRecognitionState === 'TRANSCRIBING'
                                                }
                                                style={{
                                                    backgroundColor: (speechRecognitionState === 'RECORDING' ||
                                                    speechRecognitionState === 'TRANSCRIBING'
                                                        ? Color.from('#ff4444')
                                                        : buttonColor
                                                    ).toHex(),
                                                    color: (speechRecognitionState === 'RECORDING' ||
                                                    speechRecognitionState === 'TRANSCRIBING'
                                                        ? Color.from('#ffffff')
                                                        : buttonColor.then(textColor)
                                                    ).toHex(),
                                                }}
                                                className={classNames(
                                                    styles.voiceButton,
                                                    (isVoiceCalling ||
                                                        speechRecognitionState === 'RECORDING' ||
                                                        speechRecognitionState === 'TRANSCRIBING') &&
                                                        styles.voiceButtonActive,
                                                )}
                                                onClick={handleButtonClick((event) => {
                                                    event.preventDefault();
                                                    handleToggleVoiceInput();
                                                })}
                                                title={
                                                    speechRecognitionState === 'RECORDING'
                                                        ? 'Stop recording'
                                                        : speechRecognitionState === 'TRANSCRIBING'
                                                        ? 'Transcribing...'
                                                        : 'Start voice input'
                                                }
                                            >
                                                <MicIcon size={25} />
                                            </button>
                                        )}

                                        <button
                                            data-button-type="call-to-action"
                                            style={{
                                                backgroundColor: buttonColor.toHex(),
                                                color: buttonColor.then(textColor).toHex(),
                                            }}
                                            ref={buttonSendRef}
                                            onClick={handleButtonClick((event) => {
                                                if (!onMessage) {
                                                    return;
                                                }

                                                event.preventDefault();
                                                /* not await */ handleSend();
                                            })}
                                        >
                                            <SendIcon size={25} />
                                        </button>
                                    </div>
                                );
                            })()}

                            {/* Upload progress indicator */}
                            {isUploading && (
                                <div className={styles.uploadProgress}>
                                    <div className={styles.uploadProgressBar}>
                                        <div className={styles.uploadProgressFill}></div>
                                    </div>
                                    <span>Uploading files...</span>
                                </div>
                            )}

                            {/* Drag overlay */}
                            {isDragOver && onFileUpload && (
                                <div className={styles.dragOverlay}>
                                    <div className={styles.dragOverlayContent}>
                                        <AttachmentIcon size={48} />
                                        <span>Drop files here to upload</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {toolCallModalOpen && selectedToolCall && (
                <div
                    className={styles.ratingModal}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setToolCallModalOpen(false);
                        }
                    }}
                >
                    <div className={classNames(styles.ratingModalContent, styles.toolCallModal)}>
                        {(() => {
                            const isSearch =
                                selectedToolCall.name === 'web_search' ||
                                selectedToolCall.name === 'useSearchEngine' ||
                                selectedToolCall.name === 'search';

                            const isTime =
                                selectedToolCall.name === 'get_current_time' || selectedToolCall.name === 'useTime';

                            const isEmail =
                                selectedToolCall.name === 'send_email' || selectedToolCall.name === 'useEmail';

                            const args = parseToolCallArguments(selectedToolCall);

                            const resultRaw = parseToolCallResult(selectedToolCall.result);
                            const teamResult = parseTeamToolResult(resultRaw);

                            const toolCallDate = getToolCallTimestamp(selectedToolCall);

                            const { results, rawText } = extractSearchResults(resultRaw);
                            const hasResults = results.length > 0;
                            const hasRawText = !hasResults && !!rawText && rawText.trim().length > 0;

                            if (teamResult?.teammate) {
                                const teammateUrl = teamResult.teammate.url || '';
                                const baseTime = toolCallDate ? toolCallDate.getTime() : Date.now();

                                // Build messages from conversation
                                const messages = (teamResult.conversation || [])
                                    .filter((entry) => entry && entry.content)
                                    .map((entry, index) => ({
                                        id: `team-${index}`,
                                        createdAt: new Date(baseTime + index * 1000),
                                        sender:
                                            entry.sender === 'TEAMMATE' || entry.role === 'TEAMMATE'
                                                ? 'TEAMMATE'
                                                : 'AGENT',
                                        content: entry.content || '',
                                        isComplete: true,
                                    }));

                                if (messages.length === 0) {
                                    if (teamResult.request) {
                                        messages.push({
                                            id: 'team-request',
                                            createdAt: new Date(baseTime),
                                            sender: 'AGENT',
                                            content: teamResult.request,
                                            isComplete: true,
                                        });
                                    }
                                    if (teamResult.response) {
                                        messages.push({
                                            id: 'team-response',
                                            createdAt: new Date(baseTime + 1000),
                                            sender: 'TEAMMATE',
                                            content: teamResult.response,
                                            isComplete: true,
                                        });
                                    }
                                }

                                // Extract agent names from conversation or use defaults
                                const agentName =
                                    teamResult.conversation?.find(
                                        (entry) => entry.sender === 'AGENT' || entry.role === 'AGENT',
                                    )?.name || 'Agent';

                                // For teammate, use conversation name first, then label, then extract from URL
                                const teammateName =
                                    teamResult.conversation?.find(
                                        (entry) => entry.sender === 'TEAMMATE' || entry.role === 'TEAMMATE',
                                    )?.name ||
                                    teamResult.teammate.label ||
                                    (() => {
                                        // Try to extract agent name from URL if available
                                        try {
                                            const url = new URL(teammateUrl);
                                            const pathParts = url.pathname.split('/').filter(Boolean);
                                            return pathParts[pathParts.length - 1] || 'Teammate';
                                        } catch {
                                            return 'Teammate';
                                        }
                                    })();

                                const participants = [
                                    {
                                        name: 'AGENT',
                                        fullname: agentName,
                                        color: '#64748b',
                                    },
                                    {
                                        name: 'TEAMMATE',
                                        fullname: teammateName,
                                        color: '#0ea5e9',
                                    },
                                ];

                                return (
                                    <>
                                        {teammateUrl && (
                                            <div className={styles.searchModalHeader}>
                                                <a
                                                    href={teammateUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.searchModalQuery}
                                                    style={{ textDecoration: 'none', color: 'inherit' }}
                                                >
                                                    <span className={styles.searchModalIcon}>🤝</span>
                                                    <h3 style={{ display: 'inline', margin: 0 }}>{teammateName}</h3>
                                                </a>
                                            </div>
                                        )}

                                        <div className={styles.searchModalContent}>
                                            {messages.length > 0 ? (
                                                <div className={styles.teamChatContainer}>
                                                    <MockedChat
                                                        title={`Chat with ${teammateName}`}
                                                        messages={messages}
                                                        participants={participants}
                                                        isResettable={false}
                                                        isPausable={false}
                                                        isSaveButtonEnabled={false}
                                                        isCopyButtonEnabled={false}
                                                        visual="STANDALONE"
                                                        delayConfig={FAST_FLOW}
                                                    />
                                                </div>
                                            ) : (
                                                <div className={styles.noResults}>
                                                    No teammate conversation available.
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            }

                            if (isSearch) {
                                return (
                                    <>
                                        <div className={styles.searchModalHeader}>
                                            <span className={styles.searchModalIcon}>🔎</span>
                                            <h3 className={styles.searchModalQuery}>
                                                {args.query || args.searchText || 'Search Results'}
                                            </h3>
                                        </div>

                                        <div className={styles.searchModalContent}>
                                            {hasResults ? (
                                                <div className={styles.searchResultsList}>
                                                    {(results as Array<TODO_any>).map((item, i) => (
                                                        <div key={i} className={styles.searchResultItem}>
                                                            <div className={styles.searchResultUrl}>
                                                                {item.url && (
                                                                    <a href={item.url} target="_blank" rel="noreferrer">
                                                                        {item.url}
                                                                    </a>
                                                                )}
                                                            </div>
                                                            <h4 className={styles.searchResultTitle}>
                                                                {item.url ? (
                                                                    <a href={item.url} target="_blank" rel="noreferrer">
                                                                        {item.title || 'Untitled'}
                                                                    </a>
                                                                ) : (
                                                                    item.title || 'Untitled'
                                                                )}
                                                            </h4>
                                                            <p className={styles.searchResultSnippet}>
                                                                {item.snippet || item.content || ''}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : hasRawText ? (
                                                <MarkdownContent
                                                    className={styles.searchResultsRaw}
                                                    content={rawText!}
                                                />
                                            ) : (
                                                <div className={styles.noResults}>
                                                    {resultRaw
                                                        ? 'No search results found.'
                                                        : 'Search results are not available.'}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            }

                            if (isTime) {
                                const timeResultDate = getToolCallResultDate(resultRaw);
                                const displayDate = timeResultDate || toolCallDate;
                                const isValidDate = !!displayDate && !isNaN(displayDate.getTime());
                                const relativeLabel = toolCallDate ? `called ${moment(toolCallDate).fromNow()}` : null;

                                return (
                                    <>
                                        <div className={styles.searchModalHeader}>
                                            <span className={styles.searchModalIcon}>🕒</span>
                                            <h3 className={styles.searchModalQuery}>Time at call</h3>
                                        </div>

                                        <div className={styles.searchModalContent}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '20px',
                                                    padding: '20px',
                                                }}
                                            >
                                                {isValidDate && displayDate && (
                                                    <ClockIcon date={displayDate} size={150} />
                                                )}
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
                                                        {isValidDate && displayDate
                                                            ? displayDate.toLocaleTimeString([], {
                                                                  hour: '2-digit',
                                                                  minute: '2-digit',
                                                              })
                                                            : 'Unknown time'}
                                                    </div>
                                                    <div style={{ color: '#666' }}>
                                                        {isValidDate && displayDate
                                                            ? displayDate.toLocaleDateString()
                                                            : 'Unknown date'}
                                                    </div>
                                                    {relativeLabel && (
                                                        <div
                                                            style={{
                                                                fontSize: '0.9em',
                                                                color: '#888',
                                                                marginTop: '5px',
                                                            }}
                                                        >
                                                            ({relativeLabel})
                                                        </div>
                                                    )}
                                                    {args.timezone && (
                                                        <div
                                                            style={{
                                                                fontSize: '0.9em',
                                                                color: '#888',
                                                                marginTop: '5px',
                                                            }}
                                                        >
                                                            Timezone: {args.timezone}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.toolCallDetails}>
                                                <p>
                                                    <strong>Timestamp of call:</strong>
                                                </p>
                                                <div className={styles.toolCallDataContainer}>
                                                    <pre className={styles.toolCallData}>
                                                        {toolCallDate ? toolCallDate.toLocaleString() : 'Unknown'}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            }

                            if (isEmail) {
                                const to = args.to || [];
                                const cc = args.cc || [];
                                const subject = args.subject || 'No subject';
                                const body = args.body || '';
                                const recipients = Array.isArray(to) ? to : [to];
                                const ccRecipients = Array.isArray(cc) ? cc : [];
                                const emailResult =
                                    resultRaw && typeof resultRaw === 'object' ? (resultRaw as Record<string, TODO_any>) : null;
                                const from =
                                    (emailResult?.from as string | undefined) ||
                                    (emailResult?.sender as string | undefined) ||
                                    'Configured sender';
                                const sentAt = toolCallDate ? toolCallDate.toLocaleString() : null;
                                const status = typeof emailResult?.status === 'string' ? emailResult.status : null;

                                return (
                                    <>
                                        <div className={classNames(styles.searchModalHeader, styles.emailModalHeader)}>
                                            <span className={styles.searchModalIcon}>
                                                <EmailIcon size={26} />
                                            </span>
                                            <div className={styles.emailHeaderText}>
                                                <span className={styles.emailHeaderLabel}>Email</span>
                                                <h3 className={styles.searchModalQuery}>{subject}</h3>
                                            </div>
                                        </div>

                                        <div className={styles.searchModalContent}>
                                            <div className={styles.emailContainer}>
                                                <div className={styles.emailMetadata}>
                                                    <div className={styles.emailField}>
                                                        <strong>From:</strong>
                                                        <span className={styles.emailRecipients}>{from}</span>
                                                    </div>
                                                    <div className={styles.emailField}>
                                                        <strong>To:</strong>
                                                        <span className={styles.emailRecipients}>
                                                            {recipients.join(', ')}
                                                        </span>
                                                    </div>
                                                    {ccRecipients.length > 0 && (
                                                        <div className={styles.emailField}>
                                                            <strong>CC:</strong>
                                                            <span className={styles.emailRecipients}>
                                                                {ccRecipients.join(', ')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className={styles.emailField}>
                                                        <strong>Subject:</strong>
                                                        <span>{subject}</span>
                                                    </div>
                                                    {sentAt && (
                                                        <div className={styles.emailField}>
                                                            <strong>Sent:</strong>
                                                            <span>{sentAt}</span>
                                                        </div>
                                                    )}
                                                    {status && (
                                                        <div className={styles.emailField}>
                                                            <strong>Status:</strong>
                                                            <span className={styles.emailStatus}>{status}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={styles.emailBody}>
                                                    <strong>Message:</strong>
                                                    <div className={styles.emailBodyContent}>
                                                        <MarkdownContent content={body} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={styles.toolCallDetails}>
                                                <p>
                                                    <strong>Result:</strong>
                                                </p>
                                                <div className={styles.toolCallDataContainer}>
                                                    <pre className={styles.toolCallData}>
                                                        {typeof resultRaw === 'object'
                                                            ? JSON.stringify(resultRaw, null, 2)
                                                            : String(resultRaw)}
                                                    </pre>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            }

                            // Fallback for other tools
                            return (
                                <>
                                    <h3>Tool Call: {toolTitles?.[selectedToolCall.name] || selectedToolCall.name}</h3>
                                    <div className={styles.toolCallDetails}>
                                        <p>
                                            <strong>Arguments:</strong>
                                        </p>
                                        <div className={styles.toolCallDataContainer}>
                                            {args && typeof args === 'object' ? (
                                                <ul className={styles.toolCallArgsList}>
                                                    {Object.entries(args).map(([key, value]) => (
                                                        <li key={key}>
                                                            <strong>{key}:</strong>{' '}
                                                            {typeof value === 'object'
                                                                ? JSON.stringify(value)
                                                                : String(value)}
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <pre className={styles.toolCallData}>{String(args)}</pre>
                                            )}
                                        </div>
                                        <p>
                                            <strong>Result:</strong>
                                        </p>
                                        <div className={styles.toolCallDataContainer}>
                                            <pre className={styles.toolCallData}>
                                                {typeof resultRaw === 'object'
                                                    ? JSON.stringify(resultRaw, null, 4)
                                                    : String(resultRaw)}
                                            </pre>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}

                        <div className={styles.ratingActions}>
                            <button onClick={() => setToolCallModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {citationModalOpen && selectedCitation && (
                <div
                    className={styles.ratingModal}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setCitationModalOpen(false);
                        }
                    }}
                >
                    <div className={classNames(styles.ratingModalContent, styles.toolCallModal)}>
                        <div className={styles.searchModalHeader}>
                            <span className={styles.searchModalIcon}>📄</span>
                            <h3 className={styles.searchModalQuery}>{selectedCitation.source}</h3>
                        </div>

                        <div className={styles.searchModalContent}>
                            <div className={styles.citationDetails}>
                                <div className={styles.citationMetadata}>
                                    <p>
                                        <strong>Citation ID:</strong> {selectedCitation.id}
                                    </p>
                                    <p>
                                        <strong>Source:</strong> {selectedCitation.source}
                                    </p>
                                    {selectedCitation.url && (
                                        <p>
                                            <strong>URL:</strong>{' '}
                                            <a href={selectedCitation.url} target="_blank" rel="noopener noreferrer">
                                                {selectedCitation.url}
                                            </a>
                                        </p>
                                    )}
                                </div>

                                {selectedCitation.excerpt && (
                                    <div className={styles.citationExcerpt}>
                                        <h4>Excerpt:</h4>
                                        <MarkdownContent content={selectedCitation.excerpt} />
                                    </div>
                                )}

                                {!selectedCitation.excerpt && (
                                    <div className={styles.noResults}>
                                        <p>No preview available for this source.</p>
                                        <p className={styles.citationHint}>
                                            This citation references content from the source document.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.ratingActions}>
                            <button onClick={() => setCitationModalOpen(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {ratingModalOpen && selectedMessage && (
                <div
                    className={styles.ratingModal}
                    onClick={(e) => {
                        // Close modal when clicking backdrop on mobile
                        if (e.target === e.currentTarget && isMobile) {
                            setRatingModalOpen(false);
                        }
                    }}
                >
                    <div className={styles.ratingModalContent}>
                        <h3>Rate this response</h3>
                        <div className={styles.stars}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                    key={star}
                                    onClick={() =>
                                        setMessageRatings((previousRatings) => {
                                            const nextRatings = new Map(previousRatings);
                                            nextRatings.set(
                                                selectedMessage.id || selectedMessage.content /* <-[💃] */,
                                                star,
                                            );
                                            return nextRatings;
                                        })
                                    }
                                    onMouseEnter={() => setHoveredRating(star)}
                                    onMouseLeave={() => setHoveredRating(0)}
                                    className={styles.ratingModalStar}
                                    style={{
                                        color:
                                            star <=
                                            (hoveredRating ||
                                                messageRatings.get(
                                                    selectedMessage.id || selectedMessage.content /* <-[💃] */,
                                                ) ||
                                                0)
                                                ? '#FFD700'
                                                : mode === 'LIGHT'
                                                ? '#ccc'
                                                : '#555',
                                    }}
                                >
                                    ⭐
                                </span>
                            ))}
                        </div>
                        Your question:
                        <textarea
                            readOnly
                            value={(() => {
                                // Try to find the user's message before the selectedMessage
                                const idx = postprocessedMessages.findIndex((m) => m.id === selectedMessage.id);
                                if (idx > 0) {
                                    const prev = postprocessedMessages[idx - 1];

                                    if (prev!.sender === 'USER') {
                                        return prev!.content;
                                    }
                                }
                                // fallback: find last USER message before selectedMessage
                                for (let i = messages.findIndex((m) => m.id === selectedMessage.id) - 1; i >= 0; i--) {
                                    if (messages![i]!.sender === 'USER') {
                                        return messages![i]!.content;
                                    }
                                }
                                return '';
                            })()}
                            className={styles.ratingInput}
                        />
                        Expected answer:
                        <textarea
                            placeholder={selectedMessage.content || 'Expected answer (optional)'}
                            defaultValue={selectedMessage.expectedAnswer || selectedMessage.content}
                            onChange={(e) => {
                                if (selectedMessage) {
                                    setSelectedMessage({ ...selectedMessage, expectedAnswer: e.target.value });
                                }
                            }}
                            className={styles.ratingInput}
                        />
                        Note:
                        <textarea
                            // Note: This is correctly mapped to `textRating` not a `note` which is universal column in lot of other tables and means the internal note
                            placeholder="Add a note (optional)"
                            defaultValue={textRating}
                            onChange={(e) => setTextRating(e.target.value)}
                            className={styles.ratingInput}
                        />
                        <div className={styles.ratingActions}>
                            <button onClick={() => setRatingModalOpen(false)}>Cancel</button>
                            <button onClick={submitRating}>Submit</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
