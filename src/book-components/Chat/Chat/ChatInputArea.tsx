'use client';

import {
    type CSSProperties,
    type MouseEvent,
} from 'react';
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
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { resolveChatMessageReplyPreviewText } from '../utils/resolveChatMessageReplyPreviewText';
import { resolveChatMessageReplySenderLabel } from '../utils/resolveChatMessageReplySenderLabel';
import styles from './Chat.module.css';
import { ChatReplyPreview } from './ChatReplyPreview';
import { ChatInputAreaDictationPanel } from './ChatInputAreaDictationPanel';
import { chatCssClassNames } from './chatCssClassNames';
import type { ChatProps, ChatSoundSystem } from './ChatProps';
import { useChatInputAreaAttachments } from './useChatInputAreaAttachments';
import { useChatInputAreaComposer } from './useChatInputAreaComposer';
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
    replyingToMessage?: ChatMessage | null;
    onCancelReply?: ChatProps['onCancelReply'];
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
    chatUiTranslations?: ChatProps['chatUiTranslations'];
};

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
        replyingToMessage,
        onCancelReply,
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
        chatUiTranslations,
    } = props;
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

    const {
        textareaRef,
        messageContent,
        messageContentRef,
        applyMessageContent,
        handleTextInputChange,
        handleComposerKeyDown,
        handleSend,
    } = useChatInputAreaComposer({
        onMessage,
        onChange,
        defaultMessage,
        enterBehavior,
        resolveEnterBehavior,
        isFocusedOnLoad,
        isMobile,
        uploadedFiles,
        uploadedFilesRef,
        clearUploadedFiles,
        replyingToMessage,
        onCancelReply,
        soundSystem,
    });

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

    if (!onMessage) {
        return null;
    }

    const myColor = participants.find((participant) => participant.isMe)?.color || USER_CHAT_COLOR;
    const inputBgColor = Color.from(myColor).then(lighten(0.4)).then(grayscale(0.7));
    const inputTextColor = inputBgColor.then(textColor);
    const replyPreviewLabel = chatUiTranslations?.replyingToLabel || 'Replying to';
    const cancelReplyLabel = chatUiTranslations?.cancelReplyLabel || 'Cancel reply';
    const replyPreviewText = replyingToMessage
        ? resolveChatMessageReplyPreviewText(replyingToMessage, { maxLength: 180, emptyLabel: 'Original message' })
        : null;
    const replySenderLabel = replyingToMessage
        ? resolveChatMessageReplySenderLabel({
              sender: replyingToMessage.sender,
              participants,
          })
        : null;

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
            {replyingToMessage && replyPreviewText && replySenderLabel && (
                <ChatReplyPreview
                    label={replyPreviewLabel}
                    senderLabel={replySenderLabel}
                    previewText={replyPreviewText}
                    className={styles.replyComposerPreview}
                    dismissLabel={cancelReplyLabel}
                    onDismiss={onCancelReply || undefined}
                />
            )}

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
                    ref={textareaRef}
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
