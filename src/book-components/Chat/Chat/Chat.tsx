'use client';
// <- Note: [👲] 'use client' is enforced by Next.js when building the https://book-components.ptbk.io/ but in ideal case,
//          this would not be here because the `@promptbook/components` package should be React library independent of Next.js specifics

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import spaceTrim from 'spacetrim';
import { Color, grayscale, lighten, textColor } from '../../../_packages/color.index';
import { normalizeToKebabCase } from '../../../_packages/utils.index';
import { USER_CHAT_COLOR } from '../../../config';
import type { id } from '../../../types/typeAliases';
import { countLines } from '../../../utils/expectation-counters/countLines';
import { humanizeAiText } from '../../../utils/markdown/humanizeAiText';
import { promptbookifyAiText } from '../../../utils/markdown/promptbookifyAiText';
import { classNames } from '../../_common/react-utils/classNames';
import { ArrowIcon } from '../../icons/ArrowIcon';
import { AttachmentIcon } from '../../icons/AttachmentIcon';
import { CloseIcon } from '../../icons/CloseIcon';
import { ResetIcon } from '../../icons/ResetIcon';
import { SaveIcon } from '../../icons/SaveIcon';
import { SendIcon } from '../../icons/SendIcon';
import { TemplateIcon } from '../../icons/TemplateIcon';
import { useChatAutoScroll } from '../hooks/useChatAutoScroll';
import { getChatSaveFormatDefinitions } from '../save/_common/getChatSaveFormatDefinitions';
import type { string_chat_format_name } from '../save/_common/string_chat_format_name';
import type { ChatMessage } from '../types/ChatMessage';
import styles from './Chat.module.css';
import { ChatMessageItem } from './ChatMessageItem'; // <- [🥂]
import type { ChatProps } from './ChatProps';

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
        saveFormats,
        isSaveButtonEnabled = true,
        isCopyButtonEnabled = true,
    } = props;

    const { onUseTemplate } = props;

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
        [textareaRef, isMobile],
    );

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

                // Also append the result of onFileUpload to the message input area
                if (textareaRef.current && newUploadedFiles.length > 0) {
                    const currentValue = textareaRef.current.value;
                    const fileContents = newUploadedFiles.map((f) => f.content).join(' ');
                    const newValue = currentValue ? `${currentValue} ${fileContents}` : fileContents;
                    textareaRef.current.value = newValue;

                    // Trigger onChange if it exists
                    if (onChange) {
                        onChange(newValue);
                    }
                }
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
            let messageContent = textareaElement.value;

            // Append file upload results to the message if any files are uploaded
            if (uploadedFiles.length > 0) {
                const fileContents = uploadedFiles.map((f) => f.content).join(' ');
                messageContent = messageContent ? `${messageContent} ${fileContents}` : fileContents;
            }

            if (spaceTrim(messageContent) === '') {
                throw new Error(`You need to write some text or upload a file`);
            }

            await onMessage(messageContent);

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
    const firstMessageFromUser = messages[0]?.from === 'USER';
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

    // Download logic
    const [showSaveMenu, setShowSaveMenu] = useState(false);

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

            <div className={classNames(className, styles.Chat, useChatCssClassName('Chat'))} {...{ style }}>
                <div className={classNames(className, styles.chatMainFlow, useChatCssClassName('chatMainFlow'))}>
                    {children && <div className={classNames(styles.chatChildren)}>{children}</div>}

                    {!isAutoScrolling && (
                        <div className={styles.scrollToBottomContainer}>
                            <button
                                data-button-type="custom"
                                className={classNames(styles.scrollToBottom, scrollToBottomCssClassName)}
                                onClick={scrollToBottom}
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

                    <div className={classNames(actionsAlignmentClass)}>
                        {onReset && postprocessedMessages.length !== 0 && (
                            <button
                                className={classNames(styles.chatButton)}
                                onClick={() => {
                                    if (!confirm(`Do you really want to reset the chat?`)) {
                                        return;
                                    }

                                    onReset();
                                }}
                            >
                                <ResetIcon />
                                <span className={styles.chatButtonText}>New chat</span>
                            </button>
                        )}

                        {isSaveButtonEnabled && postprocessedMessages.length !== 0 && (
                            <div className={styles.saveButtonContainer}>
                                <button
                                    className={classNames(styles.chatButton)}
                                    onClick={() => setShowSaveMenu((v) => !v)}
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
                                    </div>
                                )}
                            </div>
                        )}

                        {onUseTemplate && (
                            <button className={classNames(styles.useTemplateButton)} onClick={onUseTemplate}>
                                <span className={styles.chatButtonText}>Use this template</span>
                                <TemplateIcon size={16} />
                            </button>
                        )}

                        {/* Extra custom action buttons (e.g. Pause/Resume for MockedChat) */}
                        {extraActions}
                    </div>

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
                            const participant = participants.find((participant) => participant.name === message.from);
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
                                />
                            );
                        })}
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
                                            } as React.CSSProperties
                                        }
                                    >
                                        <textarea
                                            ref={(element) => {
                                                textareaRef.current = element;
                                            }}
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
                                                    className={styles.attachmentButton}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={isUploading}
                                                    title="Attach file"
                                                >
                                                    <AttachmentIcon size={20} />
                                                </button>
                                            </>
                                        )}

                                        <button
                                            data-button-type="call-to-action"
                                            ref={buttonSendRef}
                                            onClick={(event) => {
                                                if (!onMessage) {
                                                    return;
                                                }

                                                event.preventDefault();
                                                /* not await */ handleSend();
                                            }}
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

                                    if (prev!.from === 'USER') {
                                        return prev!.content;
                                    }
                                }
                                // fallback: find last USER message before selectedMessage
                                for (let i = messages.findIndex((m) => m.id === selectedMessage.id) - 1; i >= 0; i--) {
                                    if (messages![i]!.from === 'USER') {
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
