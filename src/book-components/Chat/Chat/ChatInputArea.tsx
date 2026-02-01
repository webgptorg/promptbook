'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type ChangeEvent,
    type ClipboardEvent,
    type DragEvent,
    type MouseEvent,
} from 'react';
import spaceTrim from 'spacetrim';
import { USER_CHAT_COLOR } from '../../../config';
import { SpeechRecognitionEvent, SpeechRecognitionState } from '../../../types/SpeechRecognition';
import { Color } from '../../../utils/color/Color';
import { textColor } from '../../../utils/color/operators/furthest';
import { grayscale } from '../../../utils/color/operators/grayscale';
import { lighten } from '../../../utils/color/operators/lighten';
import { countLines } from '../../../utils/expectation-counters/countLines';
import type { WithTake } from '../../../utils/take/interfaces/ITakeChain';
import { classNames } from '../../_common/react-utils/classNames';
import { AttachmentIcon } from '../../icons/AttachmentIcon';
import { CloseIcon } from '../../icons/CloseIcon';
import { MicIcon } from '../../icons/MicIcon';
import { SendIcon } from '../../icons/SendIcon';
import type { ChatParticipant } from '../types/ChatParticipant';
import type { ChatProps, ChatSoundSystem } from './ChatProps';
import styles from './Chat.module.css';

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
    defaultMessage?: string;
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
        defaultMessage,
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
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<Array<ChatInputUploadedFile>>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [speechRecognitionState, setSpeechRecognitionState] = useState<SpeechRecognitionState>('IDLE');

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

    useEffect(() => {
        if (!speechRecognition) {
            return;
        }

        const unsubscribe = speechRecognition.subscribe((event: SpeechRecognitionEvent) => {
            if (event.type === 'START') {
                setSpeechRecognitionState('RECORDING');
            } else if (event.type === 'RESULT') {
                if (textareaRef.current) {
                    const textarea = textareaRef.current;
                    const currentValue = textarea.value;
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
            speechRecognition.$start({ language: 'en' });
        } else {
            speechRecognition.$stop();
        }
    }, [speechRecognition]);

    const handleFileUpload = useCallback(
        async (files: FileList | File[]) => {
            if (!onFileUpload) {
                return;
            }

            setIsUploading(true);
            const fileArray = Array.from(files);

            try {
                const newUploadedFiles: Array<ChatInputUploadedFile> = [];
                for (const file of fileArray) {
                    const content = await onFileUpload(file);
                    newUploadedFiles.push({
                        id: Math.random().toString(36).substring(2),
                        file,
                        content,
                    });
                }

                setUploadedFiles((previous) => [...previous, ...newUploadedFiles]);
            } catch (error) {
                console.error('File upload failed:', error);
                alert('File upload failed. Please try again.');
            } finally {
                setIsUploading(false);
            }
        },
        [onFileUpload],
    );

    const handleDrop = useCallback(
        (event: DragEvent) => {
            event.preventDefault();
            setIsDragOver(false);

            if (!onFileUpload) {
                return;
            }

            const files = event.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files);
            }
        },
        [onFileUpload, handleFileUpload],
    );

    const handleDragOver = useCallback((event: DragEvent) => {
        event.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((event: DragEvent) => {
        event.preventDefault();
        setIsDragOver(false);
    }, []);

    const handlePaste = useCallback(
        (event: ClipboardEvent) => {
            if (!onFileUpload) {
                return;
            }

            const files = event.clipboardData.files;
            if (files.length > 0) {
                handleFileUpload(files);
            }
        },
        [onFileUpload, handleFileUpload],
    );

    const handleFileInputChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (files && files.length > 0) {
                handleFileUpload(files);
            }
            event.target.value = '';
        },
        [handleFileUpload],
    );

    const removeUploadedFile = useCallback((fileId: string) => {
        setUploadedFiles((previous) => previous.filter((file) => file.id !== fileId));
    }, []);

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
            const messageContent = textareaElement.value;
            const attachments = uploadedFiles.map((uploadedFile) => ({
                name: uploadedFile.file.name,
                type: uploadedFile.file.type,
                url: uploadedFile.content,
            }));

            if (spaceTrim(messageContent) === '' && attachments.length === 0) {
                throw new Error(`You need to write some text or upload a file`);
            }

            if (soundSystem) {
                /* not await */ soundSystem.play('message_send');
            }

            textareaElement.value = '';
            setUploadedFiles([]);

            if (wasTextareaFocused) {
                textareaElement.focus();
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (onMessage as any)(messageContent, attachments).catch((error: unknown) => {
                console.error(error);
                if (error instanceof Error) {
                    alert(error.message);
                } else {
                    alert(String(error));
                }
            });
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            console.error(error);
            alert(error.message);
        }
    }, [onMessage, uploadedFiles, soundSystem]);

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
                className={styles.inputContainer}
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
                    onPaste={handlePaste}
                    style={{
                        height:
                            Math.max(
                                countLines(textareaRef.current?.value || defaultMessage || ''),
                                (textareaRef.current?.value || defaultMessage || '').split(/\r?\n/).length,
                                3,
                            ) *
                                25 +
                            10,
                    }}
                    defaultValue={defaultMessage}
                    placeholder={placeholderMessageContent || 'Write a message...'}
                    onKeyDown={(event) => {
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
                            onClick={onButtonClick(() => fileInputRef.current?.click())}
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
                        disabled={speechRecognitionState === 'STARTING' || speechRecognitionState === 'TRANSCRIBING'}
                        style={{
                            backgroundColor:
                                speechRecognitionState === 'RECORDING' || speechRecognitionState === 'TRANSCRIBING'
                                    ? Color.from('#ff4444').toHex()
                                    : buttonColor.toHex(),
                            color:
                                speechRecognitionState === 'RECORDING' || speechRecognitionState === 'TRANSCRIBING'
                                    ? Color.from('#ffffff').toHex()
                                    : buttonColor.then(textColor).toHex(),
                        }}
                        className={classNames(
                            styles.voiceButton,
                            (isVoiceCalling ||
                                speechRecognitionState === 'RECORDING' ||
                                speechRecognitionState === 'TRANSCRIBING') &&
                                styles.voiceButtonActive,
                        )}
                        onClick={onButtonClick((event) => {
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
                    onClick={onButtonClick((event) => {
                        event.preventDefault();
                        /* not await */ handleSend();
                    })}
                >
                    <SendIcon size={25} />
                </button>
            </div>

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
