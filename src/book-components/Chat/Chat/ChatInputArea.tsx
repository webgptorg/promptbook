'use client';

import { type CSSProperties, type MouseEvent } from 'react';
import { USER_CHAT_COLOR } from '../../../config';
import { Color } from '../../../utils/color/Color';
import { textColor } from '../../../utils/color/operators/furthest';
import { grayscale } from '../../../utils/color/operators/grayscale';
import { lighten } from '../../../utils/color/operators/lighten';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
import { AttachmentIcon } from '../../icons/AttachmentIcon';
import { CloseIcon } from '../../icons/CloseIcon';
import { MicIcon } from '../../icons/MicIcon';
import { SendIcon } from '../../icons/SendIcon';
import { classNames } from '../../_common/react-utils/classNames';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { resolveChatMessageReplyPreviewText } from '../utils/resolveChatMessageReplyPreviewText';
import { resolveChatMessageReplySenderLabel } from '../utils/resolveChatMessageReplySenderLabel';
import styles from './Chat.module.css';
import { chatCssClassNames } from './chatCssClassNames';
import { ChatInputAreaDictationPanel } from './ChatInputAreaDictationPanel';
import type { ChatInputUploadedFile } from './ChatInputUploadedFile';
import type { ChatProps, ChatSoundSystem } from './ChatProps';
import { ChatReplyPreview } from './ChatReplyPreview';
import type { SpeechRecognitionUiDescriptor } from './resolveSpeechRecognitionUiDescriptor';
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
 * Render model for the optional reply preview shown above the composer.
 *
 * @private component of `<ChatInputArea/>`
 */
type ChatInputAreaReplyPreviewModel = {
    readonly label: string;
    readonly senderLabel: string;
    readonly previewText: string;
    readonly dismissLabel: string;
    readonly onDismiss?: ChatProps['onCancelReply'];
};

/**
 * Color-derived styles shared across the composer surface and primary buttons.
 *
 * @private component of `<ChatInputArea/>`
 */
type ChatInputAreaColorModel = {
    readonly inputContainerStyle: CSSProperties;
    readonly primaryButtonStyle: CSSProperties;
};

/**
 * Creates the shared color styles used by the composer.
 *
 * @private component of `<ChatInputArea/>`
 */
function createChatInputAreaColorModel(
    participants: ReadonlyArray<ChatParticipant>,
    buttonColor: WithTake<Color>,
): ChatInputAreaColorModel {
    const myColor = participants.find((participant) => participant.isMe)?.color || USER_CHAT_COLOR;
    const inputBgColor = Color.from(myColor).then(lighten(0.4)).then(grayscale(0.7));
    const inputTextColor = inputBgColor.then(textColor);

    return {
        inputContainerStyle: {
            '--chat-placeholder-color': '#fff',
            '--input-bg-color': inputBgColor.toHex(),
            '--input-text-color': inputTextColor.toHex(),
            '--brand-color': buttonColor.toHex(),
        } as CSSProperties,
        primaryButtonStyle: {
            backgroundColor: buttonColor.toHex(),
            color: buttonColor.then(textColor).toHex(),
        },
    };
}

/**
 * Builds the reply preview view model when the composer is replying to a message.
 *
 * @private component of `<ChatInputArea/>`
 */
function createChatInputAreaReplyPreviewModel(params: {
    readonly replyingToMessage?: ChatMessage | null;
    readonly participants: ReadonlyArray<ChatParticipant>;
    readonly chatUiTranslations?: ChatProps['chatUiTranslations'];
    readonly onCancelReply?: ChatProps['onCancelReply'];
}): ChatInputAreaReplyPreviewModel | null {
    const { replyingToMessage, participants, chatUiTranslations, onCancelReply } = params;

    if (!replyingToMessage) {
        return null;
    }

    const previewText = resolveChatMessageReplyPreviewText(replyingToMessage, {
        maxLength: 180,
        emptyLabel: 'Original message',
    });
    const senderLabel = resolveChatMessageReplySenderLabel({
        sender: replyingToMessage.sender,
        participants,
    });

    if (!previewText || !senderLabel) {
        return null;
    }

    return {
        label: chatUiTranslations?.replyingToLabel || 'Replying to',
        senderLabel,
        previewText,
        dismissLabel: chatUiTranslations?.cancelReplyLabel || 'Cancel reply',
        onDismiss: onCancelReply || undefined,
    };
}

/**
 * Adds drag-and-drop handlers only when uploads are enabled.
 *
 * @private component of `<ChatInputArea/>`
 */
function createChatInputAreaRootProps(params: {
    readonly onFileUpload?: ChatProps['onFileUpload'];
    readonly handleDrop: ReturnType<typeof useChatInputAreaAttachments>['handleDrop'];
    readonly handleDragOver: ReturnType<typeof useChatInputAreaAttachments>['handleDragOver'];
    readonly handleDragLeave: ReturnType<typeof useChatInputAreaAttachments>['handleDragLeave'];
}) {
    const { onFileUpload, handleDrop, handleDragOver, handleDragLeave } = params;

    if (!onFileUpload) {
        return {};
    }

    return {
        onDrop: handleDrop,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
    };
}

/**
 * Formats uploaded file sizes for the preview chips.
 *
 * @private component of `<ChatInputArea/>`
 */
function formatUploadedFileSizeInKilobytes(fileSizeInBytes: number): string {
    return `${(fileSizeInBytes / 1024).toFixed(1)} KB`;
}

/**
 * Renders the optional reply preview section.
 *
 * @private component of `<ChatInputArea/>`
 */
function ChatInputAreaReplyPreviewSection({ replyPreview }: { replyPreview: ChatInputAreaReplyPreviewModel | null }) {
    if (!replyPreview) {
        return null;
    }

    return (
        <ChatReplyPreview
            label={replyPreview.label}
            senderLabel={replyPreview.senderLabel}
            previewText={replyPreview.previewText}
            className={styles.replyComposerPreview}
            dismissLabel={replyPreview.dismissLabel}
            onDismiss={replyPreview.onDismiss}
        />
    );
}

/**
 * Renders uploaded file previews above the composer.
 *
 * @private component of `<ChatInputArea/>`
 */
function ChatInputAreaUploadedFilesSection(props: {
    readonly uploadedFiles: ReadonlyArray<ChatInputUploadedFile>;
    readonly removeUploadedFile: (fileId: string) => void;
}) {
    const { uploadedFiles, removeUploadedFile } = props;

    if (uploadedFiles.length === 0) {
        return null;
    }

    return (
        <div className={styles.filePreviewContainer}>
            {uploadedFiles.map((uploadedFile) => (
                <div key={uploadedFile.id} className={styles.filePreview}>
                    <div className={styles.fileIcon}>📎</div>
                    <div className={styles.fileInfo}>
                        <div className={styles.fileName}>{uploadedFile.file.name}</div>
                        <div className={styles.fileSize}>
                            {formatUploadedFileSizeInKilobytes(uploadedFile.file.size)}
                        </div>
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
    );
}

/**
 * Renders the hidden file input and attachment trigger when uploads are enabled.
 *
 * @private component of `<ChatInputArea/>`
 */
function ChatInputAreaAttachmentButton(props: {
    readonly onFileUpload?: ChatProps['onFileUpload'];
    readonly fileInputRef: ReturnType<typeof useChatInputAreaAttachments>['fileInputRef'];
    readonly handleFileInputChange: ReturnType<typeof useChatInputAreaAttachments>['handleFileInputChange'];
    readonly onButtonClick: ChatInputButtonClickHandler;
    readonly openFilePicker: ReturnType<typeof useChatInputAreaAttachments>['openFilePicker'];
    readonly isUploading: boolean;
    readonly primaryButtonStyle: CSSProperties;
}) {
    const {
        onFileUpload,
        fileInputRef,
        handleFileInputChange,
        onButtonClick,
        openFilePicker,
        isUploading,
        primaryButtonStyle,
    } = props;

    if (!onFileUpload) {
        return null;
    }

    return (
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
                style={primaryButtonStyle}
                className={classNames(styles.attachmentButton, chatCssClassNames.inputAttachmentButton)}
                onClick={onButtonClick(openFilePicker)}
                disabled={isUploading}
                title="Attach file"
            >
                <AttachmentIcon size={20} />
            </button>
        </>
    );
}

/**
 * Creates the voice button colors from the current dictation state.
 *
 * @private component of `<ChatInputArea/>`
 */
function createVoiceButtonStyle(params: {
    readonly buttonColor: WithTake<Color>;
    readonly speechRecognitionUiDescriptor: SpeechRecognitionUiDescriptor;
}): CSSProperties {
    const { buttonColor, speechRecognitionUiDescriptor } = params;

    if (speechRecognitionUiDescriptor.isButtonActive) {
        return {
            backgroundColor: Color.from('#ff4444').toHex(),
            color: Color.from('#ffffff').toHex(),
        };
    }

    return {
        backgroundColor: buttonColor.toHex(),
        color: buttonColor.then(textColor).toHex(),
    };
}

/**
 * Renders the voice input trigger when speech recognition is available.
 *
 * @private component of `<ChatInputArea/>`
 */
function ChatInputAreaVoiceButton(props: {
    readonly speechRecognition?: ChatProps['speechRecognition'];
    readonly isVoiceCalling?: boolean;
    readonly buttonColor: WithTake<Color>;
    readonly speechRecognitionUiDescriptor: SpeechRecognitionUiDescriptor;
    readonly onButtonClick: ChatInputButtonClickHandler;
    readonly handleToggleVoiceInput: () => void;
}) {
    const {
        speechRecognition,
        isVoiceCalling,
        buttonColor,
        speechRecognitionUiDescriptor,
        onButtonClick,
        handleToggleVoiceInput,
    } = props;

    if (!speechRecognition) {
        return null;
    }

    return (
        <button
            data-button-type="voice"
            disabled={speechRecognitionUiDescriptor.isButtonDisabled}
            style={createVoiceButtonStyle({
                buttonColor,
                speechRecognitionUiDescriptor,
            })}
            className={classNames(
                styles.voiceButton,
                chatCssClassNames.inputVoiceButton,
                (isVoiceCalling || speechRecognitionUiDescriptor.isButtonActive) && styles.voiceButtonActive,
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
    );
}

/**
 * Renders the composer send button.
 *
 * @private component of `<ChatInputArea/>`
 */
function ChatInputAreaSendButton(props: {
    readonly primaryButtonStyle: CSSProperties;
    readonly onButtonClick: ChatInputButtonClickHandler;
    readonly handleSend: () => Promise<void>;
}) {
    const { primaryButtonStyle, onButtonClick, handleSend } = props;

    return (
        <button
            data-button-type="call-to-action"
            className={chatCssClassNames.inputSendButton}
            style={primaryButtonStyle}
            onClick={onButtonClick((event) => {
                event.preventDefault();
                /* not await */ handleSend();
            })}
        >
            <SendIcon size={25} />
        </button>
    );
}

/**
 * Renders the optional dictation panel below the composer.
 *
 * @private component of `<ChatInputArea/>`
 */
function ChatInputAreaDictationPanelSection(
    props: {
        readonly speechRecognition?: ChatProps['speechRecognition'];
    } & Pick<
        ReturnType<typeof useChatInputAreaDictation>,
        | 'speechRecognitionUiDescriptor'
        | 'shouldShowDictationPanel'
        | 'isDictationPanelExpanded'
        | 'dictationInterimText'
        | 'dictationError'
        | 'dictationLastFinalChunk'
        | 'dictationEditableChunk'
        | 'canBacktrack'
        | 'dictationSettings'
        | 'isBrowserSpeechFallbackSupported'
        | 'canOpenBrowserSettings'
        | 'toggleDictationPanel'
        | 'expandDictationPanel'
        | 'setDictationEditableChunk'
        | 'handleRetryPermissionRequest'
        | 'handleOpenBrowserSettings'
        | 'handleApplyCorrection'
        | 'handleBacktrackLastChunk'
        | 'handleDictationSettingChange'
    >,
) {
    const { speechRecognition } = props;

    if (!speechRecognition) {
        return null;
    }

    return (
        <ChatInputAreaDictationPanel
            bubbleText={props.speechRecognitionUiDescriptor.bubbleText}
            bubbleTone={props.speechRecognitionUiDescriptor.bubbleTone}
            shouldShowPanel={props.shouldShowDictationPanel}
            isExpanded={props.isDictationPanelExpanded}
            interimText={props.dictationInterimText}
            error={props.dictationError}
            lastFinalChunk={props.dictationLastFinalChunk}
            editableChunk={props.dictationEditableChunk}
            canBacktrack={props.canBacktrack}
            dictationSettings={props.dictationSettings}
            isBrowserSpeechFallbackSupported={props.isBrowserSpeechFallbackSupported}
            canOpenBrowserSettings={props.canOpenBrowserSettings}
            onToggleExpanded={props.toggleDictationPanel}
            onExpand={props.expandDictationPanel}
            onEditableChunkChange={props.setDictationEditableChunk}
            onRetryPermissionRequest={props.handleRetryPermissionRequest}
            onOpenBrowserSettings={props.handleOpenBrowserSettings}
            onApplyCorrection={props.handleApplyCorrection}
            onBacktrackLastChunk={props.handleBacktrackLastChunk}
            onDictationSettingChange={props.handleDictationSettingChange}
        />
    );
}

/**
 * Renders the temporary upload progress indicator.
 *
 * @private component of `<ChatInputArea/>`
 */
function ChatInputAreaUploadProgress({ isUploading }: { isUploading: boolean }) {
    if (!isUploading) {
        return null;
    }

    return (
        <div className={styles.uploadProgress}>
            <div className={styles.uploadProgressBar}>
                <div className={styles.uploadProgressFill}></div>
            </div>
            <span>Uploading files...</span>
        </div>
    );
}

/**
 * Renders the drag-and-drop overlay when uploads are enabled and active.
 *
 * @private component of `<ChatInputArea/>`
 */
function ChatInputAreaDragOverlay(props: {
    readonly isDragOver: boolean;
    readonly onFileUpload?: ChatProps['onFileUpload'];
}) {
    const { isDragOver, onFileUpload } = props;

    if (!isDragOver || !onFileUpload) {
        return null;
    }

    return (
        <div className={styles.dragOverlay}>
            <div className={styles.dragOverlayContent}>
                <AttachmentIcon size={48} />
                <span>Drop files here to upload</span>
            </div>
        </div>
    );
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

    const { inputContainerStyle, primaryButtonStyle } = createChatInputAreaColorModel(participants, buttonColor);
    const replyPreview = createChatInputAreaReplyPreviewModel({
        replyingToMessage,
        participants,
        chatUiTranslations,
        onCancelReply,
    });
    const rootProps = createChatInputAreaRootProps({
        onFileUpload,
        handleDrop,
        handleDragOver,
        handleDragLeave,
    });

    return (
        <div className={classNames(styles.chatInput, chatInputClassName, isDragOver && styles.dragOver)} {...rootProps}>
            <ChatInputAreaReplyPreviewSection replyPreview={replyPreview} />

            <ChatInputAreaUploadedFilesSection uploadedFiles={uploadedFiles} removeUploadedFile={removeUploadedFile} />

            <div
                className={classNames(styles.inputContainer, chatCssClassNames.inputContainer)}
                style={inputContainerStyle}
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

                <ChatInputAreaAttachmentButton
                    onFileUpload={onFileUpload}
                    fileInputRef={fileInputRef}
                    handleFileInputChange={handleFileInputChange}
                    onButtonClick={onButtonClick}
                    openFilePicker={openFilePicker}
                    isUploading={isUploading}
                    primaryButtonStyle={primaryButtonStyle}
                />

                <ChatInputAreaVoiceButton
                    speechRecognition={speechRecognition}
                    isVoiceCalling={isVoiceCalling}
                    buttonColor={buttonColor}
                    speechRecognitionUiDescriptor={speechRecognitionUiDescriptor}
                    onButtonClick={onButtonClick}
                    handleToggleVoiceInput={handleToggleVoiceInput}
                />

                <ChatInputAreaSendButton
                    primaryButtonStyle={primaryButtonStyle}
                    onButtonClick={onButtonClick}
                    handleSend={handleSend}
                />
            </div>

            <ChatInputAreaDictationPanelSection
                speechRecognition={speechRecognition}
                speechRecognitionUiDescriptor={speechRecognitionUiDescriptor}
                shouldShowDictationPanel={shouldShowDictationPanel}
                isDictationPanelExpanded={isDictationPanelExpanded}
                dictationInterimText={dictationInterimText}
                dictationError={dictationError}
                dictationLastFinalChunk={dictationLastFinalChunk}
                dictationEditableChunk={dictationEditableChunk}
                canBacktrack={canBacktrack}
                dictationSettings={dictationSettings}
                isBrowserSpeechFallbackSupported={isBrowserSpeechFallbackSupported}
                canOpenBrowserSettings={canOpenBrowserSettings}
                toggleDictationPanel={toggleDictationPanel}
                expandDictationPanel={expandDictationPanel}
                setDictationEditableChunk={setDictationEditableChunk}
                handleRetryPermissionRequest={handleRetryPermissionRequest}
                handleOpenBrowserSettings={handleOpenBrowserSettings}
                handleApplyCorrection={handleApplyCorrection}
                handleBacktrackLastChunk={handleBacktrackLastChunk}
                handleDictationSettingChange={handleDictationSettingChange}
            />

            <ChatInputAreaUploadProgress isUploading={isUploading} />
            <ChatInputAreaDragOverlay isDragOver={isDragOver} onFileUpload={onFileUpload} />
        </div>
    );
}
