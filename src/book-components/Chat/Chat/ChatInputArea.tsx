'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type ChangeEvent,
    type MouseEvent,
    type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { spaceTrim } from 'spacetrim';
import { USER_CHAT_COLOR } from '../../../config';
import { Color } from '../../../utils/color/Color';
import { textColor } from '../../../utils/color/operators/furthest';
import { grayscale } from '../../../utils/color/operators/grayscale';
import { lighten } from '../../../utils/color/operators/lighten';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
import { classNames } from '../../_common/react-utils/classNames';
import { AttachmentIcon } from '../../icons/AttachmentIcon';
import { CloseIcon } from '../../icons/CloseIcon';
import { MicIcon } from '../../icons/MicIcon';
import { SendIcon } from '../../icons/SendIcon';
import type { ChatParticipant } from '../types/ChatParticipant';
import styles from './Chat.module.css';
import { ChatInputAreaDictationPanel } from './ChatInputAreaDictationPanel';
import { chatCssClassNames } from './chatCssClassNames';
import type { ChatProps, ChatSoundSystem } from './ChatProps';
import { useChatInputAreaAttachments } from './useChatInputAreaAttachments';
import { useChatInputAreaDictation } from './useChatInputAreaDictation';

/**
 * Wrapper for consistent button-click sound handling.
 *
 * @private component of `<Chat/>`
 */
export type ChatInputButtonClickHandler = (
    handler?: (event: MouseEvent<HTMLButtonElement>) => void,
) => (event: MouseEvent<HTMLButtonElement>) => void;

/**
 * Internal representation of an uploaded file in the chat input.
 *
 * @private component of `<Chat/>`
 */
export type ChatInputUploadedFile = {
    id: string;
    file: File;
    content: string;
};

/**
 * Props for the chat input area.
 *
 * @private component of `<Chat/>`
 */
export type ChatInputAreaProps = {
    onMessage?: ChatProps['onMessage'];
    onChange?: ChatProps['onChange'];
    onFileUpload?: ChatProps['onFileUpload'];
    speechRecognition?: ChatProps['speechRecognition'];
    speechRecognitionLanguage?: ChatProps['speechRecognitionLanguage'];
    defaultMessage?: string;
    enterBehavior?: ChatProps['enterBehavior'];
    resolveEnterBehavior?: ChatProps['resolveEnterBehavior'];
    placeholderMessageContent?: string;
    isFocusedOnLoad?: boolean;
    isMobile: boolean;
    isVoiceCalling?: boolean;
    participants: ReadonlyArray<ChatParticipant>;
    buttonColor: WithTake<Color>;
    soundSystem?: ChatSoundSystem;
    onButtonClick: ChatInputButtonClickHandler;
    chatInputClassName?: string;
};

/**
 * Snapshot of composer state captured before one deferred Enter decision.
 *
 * @private component of `<Chat/>`
 */
type PendingEnterIntentSnapshot = {
    readonly value: string;
    readonly selectionStart: number;
    readonly selectionEnd: number;
    readonly attachmentIds: ReadonlyArray<string>;
};

/**
 * Inverts the primary Enter behavior for the `Ctrl+Enter` secondary binding.
 *
 * @private component of `<Chat/>`
 */
function invertChatEnterBehavior(
    enterBehavior: NonNullable<ChatProps['enterBehavior']>,
): NonNullable<ChatProps['enterBehavior']> {
    return enterBehavior === 'SEND' ? 'NEWLINE' : 'SEND';
}

/**
 * Resolves the effective action for one Enter key press.
 *
 * @private component of `<Chat/>`
 */
function resolveChatEnterAction(
    enterBehavior: NonNullable<ChatProps['enterBehavior']>,
    isCtrlPressed: boolean,
): NonNullable<ChatProps['enterBehavior']> {
    return isCtrlPressed ? invertChatEnterBehavior(enterBehavior) : enterBehavior;
}

/**
 * Returns true when the browser is still composing IME text.
 *
 * @private component of `<Chat/>`
 */
function isKeyboardEventComposing(event: ReactKeyboardEvent<HTMLTextAreaElement>): boolean {
    const nativeKeyboardEvent = event.nativeEvent as globalThis.KeyboardEvent & {
        readonly isComposing?: boolean;
        readonly keyCode?: number;
    };

    return nativeKeyboardEvent.isComposing === true || nativeKeyboardEvent.keyCode === 229;
}

/**
 * Inserts plain text into a textarea value at the current selection.
 *
 * @private component of `<Chat/>`
 */
function insertTextAtSelection(params: {
    readonly currentValue: string;
    readonly insertedText: string;
    readonly selectionStart: number;
    readonly selectionEnd: number;
}): { nextValue: string; caret: number } {
    const { currentValue, insertedText, selectionStart, selectionEnd } = params;
    const nextValue = currentValue.slice(0, selectionStart) + insertedText + currentValue.slice(selectionEnd);
    const caret = selectionStart + insertedText.length;

    return {
        nextValue,
        caret,
    };
}

/**
 * Compares attachment id snapshots captured around a deferred Enter resolution.
 *
 * @private component of `<Chat/>`
 */
function areAttachmentSnapshotsEqual(
    firstAttachmentIds: ReadonlyArray<string>,
    secondAttachmentIds: ReadonlyArray<string>,
): boolean {
    if (firstAttachmentIds.length !== secondAttachmentIds.length) {
        return false;
    }

    return firstAttachmentIds.every((attachmentId, index) => attachmentId === secondAttachmentIds[index]);
}

/**
 * Renders the chat input area with text, file upload, and voice controls.
 *
 * @private component of `<Chat/>`
 */
export function ChatInputArea(props: ChatInputAreaProps) {
    const {
        onMessage,
        onChange,
        onFileUpload,
        speechRecognition,
        speechRecognitionLanguage,
        defaultMessage,
        enterBehavior,
        resolveEnterBehavior,
        placeholderMessageContent,
        isFocusedOnLoad,
        isMobile,
        isVoiceCalling,
        participants,
        buttonColor,
        soundSystem,
        onButtonClick,
        chatInputClassName,
    } = props;
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [messageContent, setMessageContent] = useState(defaultMessage || '');
    const messageContentRef = useRef(messageContent);
    const isResolvingEnterBehaviorRef = useRef(false);
    const {
        fileInputRef,
        uploadedFiles,
        uploadedFilesRef,
        isDragOver,
        isUploading,
        handleDrop,
        handleDragOver,
        handleDragLeave,
        handlePaste,
        handleFileInputChange,
        removeUploadedFile,
        clearUploadedFiles,
        openFilePicker,
    } = useChatInputAreaAttachments({
        onFileUpload,
    });

    const applyMessageContent = useCallback(
        (nextContent: string) => {
            messageContentRef.current = nextContent;
            setMessageContent(nextContent);
            onChange?.(nextContent);
        },
        [onChange],
    );

    useEffect(() => {
        const nextDefaultMessage = defaultMessage || '';
        messageContentRef.current = nextDefaultMessage;
        setMessageContent(nextDefaultMessage);
    }, [defaultMessage]);

    useEffect(
        (/* Focus textarea on page load */) => {
            if (!textareaRef.current) {
                return;
            }

            const shouldFocus = isFocusedOnLoad ?? !isMobile;

            if (shouldFocus) {
                textareaRef.current.focus();
            }
        },
        [textareaRef, isMobile, isFocusedOnLoad],
    );

    const {
        speechRecognitionUiDescriptor,
        shouldShowDictationPanel,
        isDictationPanelExpanded,
        toggleDictationPanel,
        expandDictationPanel,
        dictationInterimText,
        dictationError,
        dictationLastFinalChunk,
        dictationEditableChunk,
        setDictationEditableChunk,
        canBacktrack,
        dictationSettings,
        handleDictationSettingChange,
        handleToggleVoiceInput,
        handleBacktrackLastChunk,
        handleApplyCorrection,
        handleRetryPermissionRequest,
        handleOpenBrowserSettings,
        canOpenBrowserSettings,
        isBrowserSpeechFallbackSupported,
    } = useChatInputAreaDictation({
        speechRecognition,
        speechRecognitionLanguage,
        textareaRef,
        messageContentRef,
        applyMessageContent,
    });

    const handleTextInputChange = useCallback(
        (event: ChangeEvent<HTMLTextAreaElement>) => {
            applyMessageContent(event.target.value);
        },
        [applyMessageContent],
    );

    const handleInsertNewline = useCallback(
        (selectionStart?: number, selectionEnd?: number) => {
            const textareaElement = textareaRef.current;
            if (!textareaElement) {
                return;
            }

            const resolvedSelectionStart =
                selectionStart ?? textareaElement.selectionStart ?? messageContentRef.current.length;
            const resolvedSelectionEnd = selectionEnd ?? textareaElement.selectionEnd ?? resolvedSelectionStart;
            const insertion = insertTextAtSelection({
                currentValue: messageContentRef.current,
                insertedText: '\n',
                selectionStart: resolvedSelectionStart,
                selectionEnd: resolvedSelectionEnd,
            });

            applyMessageContent(insertion.nextValue);

            requestAnimationFrame(() => {
                textareaElement.focus();
                textareaElement.setSelectionRange(insertion.caret, insertion.caret);
            });
        },
        [applyMessageContent],
    );

    const handleSend = useCallback(async () => {
        if (!onMessage) {
            throw new Error(`Can not find onMessage callback`);
        }

        const textareaElement = textareaRef.current;

        if (!textareaElement) {
            throw new Error(`Can not find textarea`);
        }

        const wasTextareaFocused = document.activeElement === textareaElement;

        try {
            const attachments = uploadedFiles.map((uploadedFile) => ({
                name: uploadedFile.file.name,
                type: uploadedFile.file.type,
                url: uploadedFile.content,
            }));
            const contentToSend = messageContentRef.current;

            if (spaceTrim(contentToSend) === '' && attachments.length === 0) {
                throw new Error(`You need to write some text or upload a file`);
            }

            if (soundSystem) {
                /* not await */ soundSystem.play('message_send');
            }

            // Capture content before optimistically clearing the textarea
            const attachmentsToSend = attachments;

            // Optimistically clear the textarea immediately on send,
            // without waiting for the server to confirm receipt.
            // On server failure the error state is shown in the chat — the text is not restored.
            applyMessageContent('');
            clearUploadedFiles();

            if (wasTextareaFocused) {
                textareaElement.focus();
            }

            await (
                onMessage as unknown as (
                    message: string,
                    attachments: Array<{ name: string; type: string; url: string }>,
                ) => Promise<void>
            )(contentToSend, attachmentsToSend);
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            console.error(error);
            alert(error.message);
        }
    }, [applyMessageContent, clearUploadedFiles, onMessage, soundSystem, uploadedFiles]);

    const handleComposerKeyDown = useCallback(
        (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key !== 'Enter') {
                return;
            }

            if (isKeyboardEventComposing(event)) {
                return;
            }

            if (event.shiftKey) {
                return;
            }

            if (!enterBehavior && !event.ctrlKey && resolveEnterBehavior) {
                event.preventDefault();

                if (isResolvingEnterBehaviorRef.current) {
                    return;
                }

                const textareaElement = textareaRef.current;
                if (!textareaElement) {
                    return;
                }

                const snapshot: PendingEnterIntentSnapshot = {
                    value: messageContentRef.current,
                    selectionStart: textareaElement.selectionStart ?? messageContentRef.current.length,
                    selectionEnd:
                        textareaElement.selectionEnd ??
                        textareaElement.selectionStart ??
                        messageContentRef.current.length,
                    attachmentIds: uploadedFilesRef.current.map((uploadedFile) => uploadedFile.id),
                };

                isResolvingEnterBehaviorRef.current = true;

                void (async () => {
                    try {
                        const resolvedBehavior = await resolveEnterBehavior();
                        if (!resolvedBehavior) {
                            return;
                        }

                        const hasSameMessageContent = messageContentRef.current === snapshot.value;
                        const hasSameAttachments = areAttachmentSnapshotsEqual(
                            snapshot.attachmentIds,
                            uploadedFilesRef.current.map((uploadedFile) => uploadedFile.id),
                        );

                        if (!hasSameMessageContent || !hasSameAttachments) {
                            return;
                        }

                        const resolvedAction = resolveChatEnterAction(resolvedBehavior, false);

                        if (resolvedAction === 'SEND') {
                            const hasTextToSend = spaceTrim(snapshot.value) !== '' || snapshot.attachmentIds.length > 0;
                            if (!hasTextToSend) {
                                return;
                            }

                            await handleSend();
                            return;
                        }

                        handleInsertNewline(snapshot.selectionStart, snapshot.selectionEnd);
                    } finally {
                        isResolvingEnterBehaviorRef.current = false;
                    }
                })();

                return;
            }

            const effectiveEnterBehavior = enterBehavior || 'SEND';
            const resolvedAction = resolveChatEnterAction(effectiveEnterBehavior, event.ctrlKey);
            event.preventDefault();

            if (resolvedAction === 'SEND') {
                /* not await */ handleSend();
                return;
            }

            handleInsertNewline();
        },
        [enterBehavior, handleInsertNewline, handleSend, resolveEnterBehavior],
    );

    if (!onMessage) {
        return null;
    }

    const myColor = participants.find((participant) => participant.isMe)?.color || USER_CHAT_COLOR;
    const inputBgColor = Color.from(myColor).then(lighten(0.4)).then(grayscale(0.7));
    const inputTextColor = inputBgColor.then(textColor);

    return (
        <div
            className={classNames(styles.chatInput, chatInputClassName, isDragOver && styles.dragOver)}
            {...(onFileUpload
                ? {
                      onDrop: handleDrop,
                      onDragOver: handleDragOver,
                      onDragLeave: handleDragLeave,
                  }
                : {})}
        >
            {uploadedFiles.length > 0 && (
                <div className={styles.filePreviewContainer}>
                    {uploadedFiles.map((uploadedFile) => (
                        <div key={uploadedFile.id} className={styles.filePreview}>
                            <div className={styles.fileIcon}>📎</div>
                            <div className={styles.fileInfo}>
                                <div className={styles.fileName}>{uploadedFile.file.name}</div>
                                <div className={styles.fileSize}>{(uploadedFile.file.size / 1024).toFixed(1)} KB</div>
                            </div>
                            <button
                                className={styles.removeFileButton}
                                onClick={() => removeUploadedFile(uploadedFile.id)}
                                title="Remove file"
                            >
                                <CloseIcon />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div
                className={classNames(styles.inputContainer, chatCssClassNames.inputContainer)}
                style={
                    {
                        '--chat-placeholder-color': '#fff',
                        '--input-bg-color': inputBgColor.toHex(),
                        '--input-text-color': inputTextColor.toHex(),
                        '--brand-color': buttonColor.toHex(),
                    } as CSSProperties
                }
            >
                <textarea
                    ref={(element) => {
                        textareaRef.current = element;
                    }}
                    className={chatCssClassNames.inputTextarea}
                    onPaste={handlePaste}
                    value={messageContent}
                    placeholder={placeholderMessageContent || 'Write a message...'}
                    onChange={handleTextInputChange}
                    onKeyDown={handleComposerKeyDown}
                />

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
                            className={classNames(styles.attachmentButton, chatCssClassNames.inputAttachmentButton)}
                            onClick={onButtonClick(openFilePicker)}
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
                        disabled={speechRecognitionUiDescriptor.isButtonDisabled}
                        style={{
                            backgroundColor: speechRecognitionUiDescriptor.isButtonActive
                                ? Color.from('#ff4444').toHex()
                                : buttonColor.toHex(),
                            color: speechRecognitionUiDescriptor.isButtonActive
                                ? Color.from('#ffffff').toHex()
                                : buttonColor.then(textColor).toHex(),
                        }}
                        className={classNames(
                            styles.voiceButton,
                            chatCssClassNames.inputVoiceButton,
                            (isVoiceCalling || speechRecognitionUiDescriptor.isButtonActive) &&
                                styles.voiceButtonActive,
                        )}
                        onClick={onButtonClick((event) => {
                            event.preventDefault();
                            handleToggleVoiceInput();
                        })}
                        title={speechRecognitionUiDescriptor.buttonTitle}
                        aria-label={speechRecognitionUiDescriptor.buttonTitle}
                    >
                        <MicIcon size={25} />
                    </button>
                )}

                <button
                    data-button-type="call-to-action"
                    className={chatCssClassNames.inputSendButton}
                    style={{
                        backgroundColor: buttonColor.toHex(),
                        color: buttonColor.then(textColor).toHex(),
                    }}
                    onClick={onButtonClick((event) => {
                        event.preventDefault();
                        /* not await */ handleSend();
                    })}
                >
                    <SendIcon size={25} />
                </button>
            </div>

            {speechRecognition && (
                <ChatInputAreaDictationPanel
                    bubbleText={speechRecognitionUiDescriptor.bubbleText}
                    bubbleTone={speechRecognitionUiDescriptor.bubbleTone}
                    shouldShowPanel={shouldShowDictationPanel}
                    isExpanded={isDictationPanelExpanded}
                    interimText={dictationInterimText}
                    error={dictationError}
                    lastFinalChunk={dictationLastFinalChunk}
                    editableChunk={dictationEditableChunk}
                    canBacktrack={canBacktrack}
                    dictationSettings={dictationSettings}
                    isBrowserSpeechFallbackSupported={isBrowserSpeechFallbackSupported}
                    canOpenBrowserSettings={canOpenBrowserSettings}
                    onToggleExpanded={toggleDictationPanel}
                    onExpand={expandDictationPanel}
                    onEditableChunkChange={setDictationEditableChunk}
                    onRetryPermissionRequest={handleRetryPermissionRequest}
                    onOpenBrowserSettings={handleOpenBrowserSettings}
                    onApplyCorrection={handleApplyCorrection}
                    onBacktrackLastChunk={handleBacktrackLastChunk}
                    onDictationSettingChange={handleDictationSettingChange}
                />
            )}

            {isUploading && (
                <div className={styles.uploadProgress}>
                    <div className={styles.uploadProgressBar}>
                        <div className={styles.uploadProgressFill}></div>
                    </div>
                    <span>Uploading files...</span>
                </div>
            )}

            {isDragOver && onFileUpload && (
                <div className={styles.dragOverlay}>
                    <div className={styles.dragOverlayContent}>
                        <AttachmentIcon size={48} />
                        <span>Drop files here to upload</span>
                    </div>
                </div>
            )}
        </div>
    );
}
