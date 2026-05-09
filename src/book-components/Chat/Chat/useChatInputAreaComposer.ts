'use client';

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type KeyboardEvent as ReactKeyboardEvent,
    type MutableRefObject,
} from 'react';
import { spaceTrim } from 'spacetrim';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatInputUploadedFile } from './ChatInputUploadedFile';
import type { ChatProps, ChatSoundSystem } from './ChatProps';

/**
 * Legacy keyCode emitted by browsers while IME text is still being composed.
 *
 * @private function of `useChatInputAreaComposer`
 */
const IME_COMPOSITION_KEY_CODE = 229;

/**
 * Snapshot of composer state captured before one deferred Enter decision.
 *
 * @private function of `useChatInputAreaComposer`
 */
type PendingEnterIntentSnapshot = {
    readonly value: string;
    readonly selectionStart: number;
    readonly selectionEnd: number;
    readonly attachmentIds: ReadonlyArray<string>;
    readonly replyingToMessageId: string | null;
};

/**
 * Props for `useChatInputAreaComposer`.
 *
 * @private function of `<ChatInputArea/>`
 */
type UseChatInputAreaComposerProps = {
    readonly onMessage?: ChatProps['onMessage'];
    readonly onChange?: ChatProps['onChange'];
    readonly defaultMessage?: string;
    readonly enterBehavior?: ChatProps['enterBehavior'];
    readonly resolveEnterBehavior?: ChatProps['resolveEnterBehavior'];
    readonly isFocusedOnLoad?: boolean;
    readonly isMobile: boolean;
    readonly uploadedFiles: ReadonlyArray<ChatInputUploadedFile>;
    readonly uploadedFilesRef: MutableRefObject<Array<ChatInputUploadedFile>>;
    readonly clearUploadedFiles: () => void;
    readonly replyingToMessage?: ChatMessage | null;
    readonly onCancelReply?: ChatProps['onCancelReply'];
    readonly soundSystem?: ChatSoundSystem;
};

/**
 * Props for internal message-content state wiring.
 *
 * @private function of `useChatInputAreaComposer`
 */
type UseChatInputAreaMessageContentStateProps = Pick<UseChatInputAreaComposerProps, 'defaultMessage' | 'onChange'>;

/**
 * Props for initial composer focus handling.
 *
 * @private function of `useChatInputAreaComposer`
 */
type UseChatInputAreaComposerFocusProps = Pick<UseChatInputAreaComposerProps, 'isFocusedOnLoad' | 'isMobile'> & {
    readonly textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
};

/**
 * Props for newline insertion handling.
 *
 * @private function of `useChatInputAreaComposer`
 */
type UseChatInputAreaNewlineHandlerProps = {
    readonly textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
    readonly messageContentRef: MutableRefObject<string>;
    readonly applyMessageContent: (nextContent: string) => void;
};

/**
 * Props for send action handling.
 *
 * @private function of `useChatInputAreaComposer`
 */
type UseChatInputAreaSendActionProps = Pick<
    UseChatInputAreaComposerProps,
    'onMessage' | 'clearUploadedFiles' | 'replyingToMessage' | 'onCancelReply' | 'soundSystem'
> & {
    readonly textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
    readonly messageContentRef: MutableRefObject<string>;
    readonly applyMessageContent: (nextContent: string) => void;
    readonly uploadedFiles: ReadonlyArray<ChatInputUploadedFile>;
};

/**
 * Props for Enter-key handling.
 *
 * @private function of `useChatInputAreaComposer`
 */
type UseChatInputAreaEnterKeyHandlerProps = Pick<
    UseChatInputAreaComposerProps,
    'enterBehavior' | 'resolveEnterBehavior' | 'replyingToMessage' | 'onCancelReply'
> & {
    readonly textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
    readonly messageContentRef: MutableRefObject<string>;
    readonly uploadedFilesRef: MutableRefObject<Array<ChatInputUploadedFile>>;
    readonly handleInsertNewline: (selectionStart?: number, selectionEnd?: number) => void;
    readonly handleSend: () => Promise<void>;
};

/**
 * Inverts the primary Enter behavior for the `Ctrl+Enter` secondary binding.
 *
 * @private function of `useChatInputAreaComposer`
 */
function invertChatEnterBehavior(
    enterBehavior: NonNullable<ChatProps['enterBehavior']>,
): NonNullable<ChatProps['enterBehavior']> {
    return enterBehavior === 'SEND' ? 'NEWLINE' : 'SEND';
}

/**
 * Resolves the effective action for one Enter key press.
 *
 * @private function of `useChatInputAreaComposer`
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
 * @private function of `useChatInputAreaComposer`
 */
function isKeyboardEventComposing(event: ReactKeyboardEvent<HTMLTextAreaElement>): boolean {
    const nativeKeyboardEvent = event.nativeEvent as globalThis.KeyboardEvent & {
        readonly isComposing?: boolean;
        readonly keyCode?: number;
    };

    return nativeKeyboardEvent.isComposing === true || nativeKeyboardEvent.keyCode === IME_COMPOSITION_KEY_CODE;
}

/**
 * Returns true when the current key press should be handled as a composer Enter action.
 *
 * @private function of `useChatInputAreaComposer`
 */
function isComposerEnterAction(event: ReactKeyboardEvent<HTMLTextAreaElement>): boolean {
    return event.key === 'Enter' && !event.shiftKey && !isKeyboardEventComposing(event);
}

/**
 * Returns true when Enter behavior should be resolved asynchronously.
 *
 * @private function of `useChatInputAreaComposer`
 */
function shouldResolveDeferredEnterBehavior(
    enterBehavior: ChatProps['enterBehavior'],
    isCtrlPressed: boolean,
    resolveEnterBehavior?: ChatProps['resolveEnterBehavior'],
): resolveEnterBehavior is NonNullable<ChatProps['resolveEnterBehavior']> {
    return !enterBehavior && !isCtrlPressed && !!resolveEnterBehavior;
}

/**
 * Returns the stable reply-target identifier used by the deferred Enter guard.
 *
 * @private function of `useChatInputAreaComposer`
 */
function getReplyingToMessageId(replyingToMessage: ChatMessage | null | undefined): string | null {
    return typeof replyingToMessage?.id === 'string' ? replyingToMessage.id : null;
}

/**
 * Inserts plain text into a textarea value at the current selection.
 *
 * @private function of `useChatInputAreaComposer`
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
 * Returns the current selection range, falling back to the current message length when needed.
 *
 * @private function of `useChatInputAreaComposer`
 */
function resolveTextareaSelection(
    textareaElement: HTMLTextAreaElement,
    messageContent: string,
    selectionStart?: number,
    selectionEnd?: number,
): { selectionStart: number; selectionEnd: number } {
    const resolvedSelectionStart = selectionStart ?? textareaElement.selectionStart ?? messageContent.length;
    const resolvedSelectionEnd = selectionEnd ?? textareaElement.selectionEnd ?? resolvedSelectionStart;

    return {
        selectionStart: resolvedSelectionStart,
        selectionEnd: resolvedSelectionEnd,
    };
}

/**
 * Focuses the textarea and restores the caret after a programmatic insertion.
 *
 * @private function of `useChatInputAreaComposer`
 */
function focusTextareaCaret(textareaElement: HTMLTextAreaElement, caret: number): void {
    requestAnimationFrame(() => {
        textareaElement.focus();
        textareaElement.setSelectionRange(caret, caret);
    });
}

/**
 * Compares attachment id snapshots captured around a deferred Enter resolution.
 *
 * @private function of `useChatInputAreaComposer`
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
 * Captures the current composer state before Enter behavior is resolved asynchronously.
 *
 * @private function of `useChatInputAreaComposer`
 */
function createPendingEnterIntentSnapshot(params: {
    readonly textareaElement: HTMLTextAreaElement;
    readonly messageContent: string;
    readonly uploadedFiles: ReadonlyArray<ChatInputUploadedFile>;
    readonly replyingToMessage: ChatMessage | null | undefined;
}): PendingEnterIntentSnapshot {
    const { textareaElement, messageContent, uploadedFiles, replyingToMessage } = params;

    return {
        value: messageContent,
        selectionStart: textareaElement.selectionStart ?? messageContent.length,
        selectionEnd: textareaElement.selectionEnd ?? textareaElement.selectionStart ?? messageContent.length,
        attachmentIds: uploadedFiles.map((uploadedFile) => uploadedFile.id),
        replyingToMessageId: getReplyingToMessageId(replyingToMessage),
    };
}

/**
 * Returns true when the deferred Enter snapshot still matches the current composer state.
 *
 * @private function of `useChatInputAreaComposer`
 */
function hasPendingEnterIntentStayedCurrent(params: {
    readonly snapshot: PendingEnterIntentSnapshot;
    readonly messageContent: string;
    readonly uploadedFiles: ReadonlyArray<ChatInputUploadedFile>;
    readonly replyingToMessage: ChatMessage | null | undefined;
}): boolean {
    const { snapshot, messageContent, uploadedFiles, replyingToMessage } = params;

    return (
        messageContent === snapshot.value &&
        areAttachmentSnapshotsEqual(
            snapshot.attachmentIds,
            uploadedFiles.map((uploadedFile) => uploadedFile.id),
        ) &&
        getReplyingToMessageId(replyingToMessage) === snapshot.replyingToMessageId
    );
}

/**
 * Returns true when the composer contains text or attachments that can be sent.
 *
 * @private function of `useChatInputAreaComposer`
 */
function hasSendableComposerContent(messageContent: string, attachmentCount: number): boolean {
    return spaceTrim(messageContent) !== '' || attachmentCount > 0;
}

/**
 * Returns true when the deferred Enter snapshot still contains something sendable.
 *
 * @private function of `useChatInputAreaComposer`
 */
function hasPendingEnterIntentContent(snapshot: PendingEnterIntentSnapshot): boolean {
    return hasSendableComposerContent(snapshot.value, snapshot.attachmentIds.length);
}

/**
 * Builds the attachment payload expected by `onMessage`.
 *
 * @private function of `useChatInputAreaComposer`
 */
function createMessageAttachments(uploadedFiles: ReadonlyArray<ChatInputUploadedFile>) {
    return uploadedFiles.map((uploadedFile) => ({
        name: uploadedFile.file.name,
        type: uploadedFile.file.type,
        url: uploadedFile.content,
    }));
}

/**
 * Resolves one deferred Enter intent after the host finishes deciding between send/newline.
 *
 * @private function of `useChatInputAreaComposer`
 */
async function resolvePendingEnterIntent(params: {
    readonly resolveEnterBehavior: NonNullable<ChatProps['resolveEnterBehavior']>;
    readonly snapshot: PendingEnterIntentSnapshot;
    readonly messageContentRef: MutableRefObject<string>;
    readonly uploadedFilesRef: MutableRefObject<Array<ChatInputUploadedFile>>;
    readonly replyingToMessage: ChatMessage | null | undefined;
    readonly handleInsertNewline: (selectionStart?: number, selectionEnd?: number) => void;
    readonly handleSend: () => Promise<void>;
}): Promise<void> {
    const {
        resolveEnterBehavior,
        snapshot,
        messageContentRef,
        uploadedFilesRef,
        replyingToMessage,
        handleInsertNewline,
        handleSend,
    } = params;
    const resolvedBehavior = await resolveEnterBehavior();

    if (!resolvedBehavior) {
        return;
    }

    if (
        !hasPendingEnterIntentStayedCurrent({
            snapshot,
            messageContent: messageContentRef.current,
            uploadedFiles: uploadedFilesRef.current,
            replyingToMessage,
        })
    ) {
        return;
    }

    if (resolveChatEnterAction(resolvedBehavior, false) === 'SEND') {
        if (!hasPendingEnterIntentContent(snapshot)) {
            return;
        }

        await handleSend();
        return;
    }

    handleInsertNewline(snapshot.selectionStart, snapshot.selectionEnd);
}

/**
 * Returns the required `onMessage` callback or throws when the composer is misconfigured.
 *
 * @private function of `useChatInputAreaComposer`
 */
function getRequiredOnMessage(
    onMessage: ChatProps['onMessage'],
): NonNullable<UseChatInputAreaComposerProps['onMessage']> {
    if (!onMessage) {
        throw new Error(`Can not find onMessage callback`);
    }

    return onMessage;
}

/**
 * Returns the active composer textarea or throws when the DOM node is missing.
 *
 * @private function of `useChatInputAreaComposer`
 */
function getRequiredTextareaElement(textareaRef: MutableRefObject<HTMLTextAreaElement | null>): HTMLTextAreaElement {
    const textareaElement = textareaRef.current;

    if (!textareaElement) {
        throw new Error(`Can not find textarea`);
    }

    return textareaElement;
}

/**
 * Manages controlled message text state and change propagation for the composer.
 *
 * @private function of `useChatInputAreaComposer`
 */
function useChatInputAreaMessageContentState({ defaultMessage, onChange }: UseChatInputAreaMessageContentStateProps) {
    const [messageContent, setMessageContent] = useState(defaultMessage || '');
    const messageContentRef = useRef(messageContent);

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

    const handleTextInputChange = useCallback(
        (event: ChangeEvent<HTMLTextAreaElement>) => {
            applyMessageContent(event.target.value);
        },
        [applyMessageContent],
    );

    return {
        messageContent,
        messageContentRef,
        applyMessageContent,
        handleTextInputChange,
    };
}

/**
 * Applies initial-focus behavior for the composer textarea.
 *
 * @private function of `useChatInputAreaComposer`
 */
function useChatInputAreaComposerFocus({
    textareaRef,
    isFocusedOnLoad,
    isMobile,
}: UseChatInputAreaComposerFocusProps): void {
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
        [isFocusedOnLoad, isMobile, textareaRef],
    );
}

/**
 * Creates the newline insertion action used by the composer Enter handling.
 *
 * @private function of `useChatInputAreaComposer`
 */
function useChatInputAreaNewlineHandler({
    textareaRef,
    messageContentRef,
    applyMessageContent,
}: UseChatInputAreaNewlineHandlerProps) {
    return useCallback(
        (selectionStart?: number, selectionEnd?: number) => {
            const textareaElement = textareaRef.current;
            if (!textareaElement) {
                return;
            }

            const resolvedSelection = resolveTextareaSelection(
                textareaElement,
                messageContentRef.current,
                selectionStart,
                selectionEnd,
            );
            const insertion = insertTextAtSelection({
                currentValue: messageContentRef.current,
                insertedText: '\n',
                selectionStart: resolvedSelection.selectionStart,
                selectionEnd: resolvedSelection.selectionEnd,
            });

            applyMessageContent(insertion.nextValue);
            focusTextareaCaret(textareaElement, insertion.caret);
        },
        [applyMessageContent, messageContentRef, textareaRef],
    );
}

/**
 * Creates the send action while keeping focus restoration and attachments in sync.
 *
 * @private function of `useChatInputAreaComposer`
 */
function useChatInputAreaSendAction({
    onMessage,
    textareaRef,
    uploadedFiles,
    clearUploadedFiles,
    messageContentRef,
    applyMessageContent,
    replyingToMessage,
    onCancelReply,
    soundSystem,
}: UseChatInputAreaSendActionProps) {
    return useCallback(async () => {
        const onMessageCallback = getRequiredOnMessage(onMessage);
        const textareaElement = getRequiredTextareaElement(textareaRef);
        const wasTextareaFocused = document.activeElement === textareaElement;

        try {
            const attachments = createMessageAttachments(uploadedFiles);
            const contentToSend = messageContentRef.current;

            if (!hasSendableComposerContent(contentToSend, attachments.length)) {
                throw new Error(`You need to write some text or upload a file`);
            }

            if (soundSystem) {
                /* not await */ soundSystem.play('message_send');
            }

            applyMessageContent('');
            clearUploadedFiles();

            if (wasTextareaFocused) {
                textareaElement.focus();
            }

            await onMessageCallback(contentToSend, attachments, replyingToMessage || null);
            onCancelReply?.();
        } catch (error) {
            if (!(error instanceof Error)) {
                throw error;
            }

            console.error(error);
            alert(error.message);
        }
    }, [
        applyMessageContent,
        clearUploadedFiles,
        messageContentRef,
        onCancelReply,
        onMessage,
        replyingToMessage,
        soundSystem,
        textareaRef,
        uploadedFiles,
    ]);
}

/**
 * Creates the keyboard handler that coordinates reply cancel, send, newline, and deferred Enter behavior.
 *
 * @private function of `useChatInputAreaComposer`
 */
function useChatInputAreaEnterKeyHandler({
    textareaRef,
    enterBehavior,
    resolveEnterBehavior,
    messageContentRef,
    uploadedFilesRef,
    replyingToMessage,
    onCancelReply,
    handleInsertNewline,
    handleSend,
}: UseChatInputAreaEnterKeyHandlerProps) {
    const isResolvingEnterBehaviorRef = useRef(false);

    const handleImmediateEnterAction = useCallback(
        (isCtrlPressed: boolean) => {
            const resolvedAction = resolveChatEnterAction(enterBehavior || 'SEND', isCtrlPressed);

            if (resolvedAction === 'SEND') {
                /* not await */ handleSend();
                return;
            }

            handleInsertNewline();
        },
        [enterBehavior, handleInsertNewline, handleSend],
    );

    const handleDeferredEnterAction = useCallback(
        (resolveDeferredEnterBehavior: NonNullable<ChatProps['resolveEnterBehavior']>) => {
            if (isResolvingEnterBehaviorRef.current) {
                return;
            }

            const textareaElement = textareaRef.current;
            if (!textareaElement) {
                return;
            }

            const snapshot = createPendingEnterIntentSnapshot({
                textareaElement,
                messageContent: messageContentRef.current,
                uploadedFiles: uploadedFilesRef.current,
                replyingToMessage,
            });

            isResolvingEnterBehaviorRef.current = true;

            void resolvePendingEnterIntent({
                resolveEnterBehavior: resolveDeferredEnterBehavior,
                snapshot,
                messageContentRef,
                uploadedFilesRef,
                replyingToMessage,
                handleInsertNewline,
                handleSend,
            }).finally(() => {
                isResolvingEnterBehaviorRef.current = false;
            });
        },
        [handleInsertNewline, handleSend, messageContentRef, replyingToMessage, textareaRef, uploadedFilesRef],
    );

    const handleReplyCancelShortcut = useCallback(
        (event: ReactKeyboardEvent<HTMLTextAreaElement>): boolean => {
            if (event.key !== 'Escape' || !replyingToMessage || !onCancelReply) {
                return false;
            }

            event.preventDefault();
            onCancelReply();

            return true;
        },
        [onCancelReply, replyingToMessage],
    );

    const handleComposerEnterKeyDown = useCallback(
        (event: ReactKeyboardEvent<HTMLTextAreaElement>): boolean => {
            if (!isComposerEnterAction(event)) {
                return false;
            }

            event.preventDefault();

            if (shouldResolveDeferredEnterBehavior(enterBehavior, event.ctrlKey, resolveEnterBehavior)) {
                handleDeferredEnterAction(resolveEnterBehavior);
                return true;
            }

            handleImmediateEnterAction(event.ctrlKey);
            return true;
        },
        [enterBehavior, handleDeferredEnterAction, handleImmediateEnterAction, resolveEnterBehavior],
    );

    return useCallback(
        (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
            if (handleReplyCancelShortcut(event)) {
                return;
            }

            handleComposerEnterKeyDown(event);
        },
        [handleComposerEnterKeyDown, handleReplyCancelShortcut],
    );
}

/**
 * Manages textarea state, send/newline behavior, and deferred Enter resolution for `<ChatInputArea/>`.
 *
 * @private function of `<ChatInputArea/>`
 */
export function useChatInputAreaComposer(props: UseChatInputAreaComposerProps) {
    const {
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
    } = props;
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const { messageContent, messageContentRef, applyMessageContent, handleTextInputChange } =
        useChatInputAreaMessageContentState({
            defaultMessage,
            onChange,
        });

    useChatInputAreaComposerFocus({
        textareaRef,
        isFocusedOnLoad,
        isMobile,
    });

    const handleInsertNewline = useChatInputAreaNewlineHandler({
        textareaRef,
        messageContentRef,
        applyMessageContent,
    });
    const handleSend = useChatInputAreaSendAction({
        onMessage,
        textareaRef,
        uploadedFiles,
        clearUploadedFiles,
        messageContentRef,
        applyMessageContent,
        replyingToMessage,
        onCancelReply,
        soundSystem,
    });
    const handleComposerKeyDown = useChatInputAreaEnterKeyHandler({
        textareaRef,
        enterBehavior,
        resolveEnterBehavior,
        messageContentRef,
        uploadedFilesRef,
        replyingToMessage,
        onCancelReply,
        handleInsertNewline,
        handleSend,
    });

    return {
        textareaRef,
        messageContent,
        messageContentRef,
        applyMessageContent,
        handleTextInputChange,
        handleComposerKeyDown,
        handleSend,
    };
}
