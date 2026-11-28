'use client';

import {
    useCallback,
    useEffect,
    useRef,
    type Dispatch,
    type KeyboardEvent,
    type MutableRefObject,
    type SetStateAction,
} from 'react';
import {
    invertAgentsServerChatEnterBehavior,
    type AgentsServerChatEnterBehavior,
} from '../../../../utils/chatEnterBehavior';

/**
 * Snapshot captured before the textarea waits for an unresolved Enter behavior.
 *
 * @private function of AgentTextareaClient
 */
type PendingTextareaEnterIntentSnapshot = {
    readonly selectionEnd: number;
    readonly selectionStart: number;
    readonly value: string;
};

/**
 * Props accepted by the textarea Enter-key controller.
 *
 * @private function of AgentTextareaClient
 */
type UseAgentTextareaEnterHandlingProps = {
    /**
     * Current resolved Enter-key preference.
     */
    readonly enterBehavior: AgentsServerChatEnterBehavior | undefined;

    /**
     * Current textarea value tracked outside the DOM.
     */
    readonly messageContentRef: MutableRefObject<string>;

    /**
     * Resolves Enter-key behavior on demand when no preference is stored yet.
     */
    readonly resolveEnterBehavior: () => Promise<AgentsServerChatEnterBehavior | null>;

    /**
     * Updates the controlled textarea value.
     */
    readonly setMessageContent: Dispatch<SetStateAction<string>>;

    /**
     * Submits current textarea content into the chat flow.
     */
    readonly submitMessage: (messageContentOverride?: string) => void;
};

/**
 * Keyboard handler and ref returned for the textarea field.
 *
 * @private function of AgentTextareaClient
 */
type UseAgentTextareaEnterHandlingResult = {
    readonly handleTextareaKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
    readonly textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
};

/**
 * Returns true when the textarea keydown event is still part of IME composition.
 */
function isTextareaKeyboardEventComposing(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
    const nativeKeyboardEvent = event.nativeEvent as globalThis.KeyboardEvent & {
        readonly isComposing?: boolean;
        readonly keyCode?: number;
    };

    return nativeKeyboardEvent.isComposing === true || nativeKeyboardEvent.keyCode === 229;
}

/**
 * Resolves the effective action for one textarea Enter key press.
 */
function resolveTextareaEnterAction(
    enterBehavior: AgentsServerChatEnterBehavior,
    isCtrlPressed: boolean,
): AgentsServerChatEnterBehavior {
    if (!isCtrlPressed) {
        return enterBehavior;
    }

    return invertAgentsServerChatEnterBehavior(enterBehavior);
}

/**
 * Returns true when the keydown event should keep the browser default textarea handling.
 */
function shouldIgnoreTextareaEnterKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (event.key !== 'Enter') {
        return true;
    }

    if (isTextareaKeyboardEventComposing(event)) {
        return true;
    }

    return event.shiftKey;
}

/**
 * Returns true when the current Enter key press must ask the user for a preference.
 */
function shouldResolveEnterBehaviorOnDemand(
    enterBehavior: AgentsServerChatEnterBehavior | undefined,
    isCtrlPressed: boolean,
): boolean {
    return !enterBehavior && !isCtrlPressed;
}

/**
 * Reads a stable textarea selection snapshot for one pending Enter press.
 */
function createPendingTextareaEnterIntentSnapshot(
    textareaElement: HTMLTextAreaElement,
    messageContent: string,
): PendingTextareaEnterIntentSnapshot {
    return {
        value: messageContent,
        selectionStart: textareaElement.selectionStart ?? messageContent.length,
        selectionEnd: textareaElement.selectionEnd ?? textareaElement.selectionStart ?? messageContent.length,
    };
}

/**
 * Resolves the selection range used when inserting text into the textarea.
 */
function resolveTextareaSelection(params: {
    readonly messageContent: string;
    readonly selectionEnd?: number;
    readonly selectionStart?: number;
    readonly textareaElement: HTMLTextAreaElement;
}): { selectionEnd: number; selectionStart: number } {
    const { messageContent, selectionStart, selectionEnd, textareaElement } = params;
    const resolvedSelectionStart = selectionStart ?? textareaElement.selectionStart ?? messageContent.length;
    const resolvedSelectionEnd = selectionEnd ?? textareaElement.selectionEnd ?? resolvedSelectionStart;

    return {
        selectionEnd: resolvedSelectionEnd,
        selectionStart: resolvedSelectionStart,
    };
}

/**
 * Inserts plain text at the textarea's current selection.
 */
function insertTextareaTextAtSelection(params: {
    readonly currentValue: string;
    readonly insertedText: string;
    readonly selectionEnd: number;
    readonly selectionStart: number;
}): { caret: number; nextValue: string } {
    const { currentValue, insertedText, selectionStart, selectionEnd } = params;

    return {
        nextValue:
            currentValue.slice(0, selectionStart) + insertedText + currentValue.slice(selectionEnd),
        caret: selectionStart + insertedText.length,
    };
}

/**
 * Applies one resolved Enter-key action to the textarea.
 */
function applyResolvedTextareaEnterAction(params: {
    readonly action: AgentsServerChatEnterBehavior;
    readonly handleInsertNewline: (selectionStart?: number, selectionEnd?: number) => void;
    readonly snapshot?: PendingTextareaEnterIntentSnapshot;
    readonly submitMessage: (messageContentOverride?: string) => void;
}): void {
    const { action, handleInsertNewline, snapshot, submitMessage } = params;

    if (action === 'SEND') {
        submitMessage(snapshot?.value);
        return;
    }

    handleInsertNewline(snapshot?.selectionStart, snapshot?.selectionEnd);
}

/**
 * Controls textarea focusing and Enter-key handling for `AgentTextareaClient`.
 *
 * @private function of AgentTextareaClient
 */
export function useAgentTextareaEnterHandling({
    enterBehavior,
    messageContentRef,
    resolveEnterBehavior,
    setMessageContent,
    submitMessage,
}: UseAgentTextareaEnterHandlingProps): UseAgentTextareaEnterHandlingResult {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const isResolvingEnterBehaviorRef = useRef(false);

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    /**
     * Inserts a newline without relying on the browser's default textarea behavior.
     */
    const handleInsertNewline = useCallback((selectionStart?: number, selectionEnd?: number) => {
        const textareaElement = textareaRef.current;
        if (!textareaElement) {
            return;
        }

        const resolvedSelection = resolveTextareaSelection({
            messageContent: messageContentRef.current,
            selectionStart,
            selectionEnd,
            textareaElement,
        });
        const insertion = insertTextareaTextAtSelection({
            currentValue: messageContentRef.current,
            insertedText: '\n',
            selectionStart: resolvedSelection.selectionStart,
            selectionEnd: resolvedSelection.selectionEnd,
        });

        setMessageContent(insertion.nextValue);

        requestAnimationFrame(() => {
            textareaElement.focus();
            textareaElement.setSelectionRange(insertion.caret, insertion.caret);
        });
    }, [messageContentRef, setMessageContent]);

    /**
     * Resolves one undecided Enter key press after the preference dialog completes.
     */
    const resolvePendingEnterBehavior = useCallback(
        async (snapshot: PendingTextareaEnterIntentSnapshot) => {
            try {
                const resolvedBehavior = await resolveEnterBehavior();
                if (!resolvedBehavior) {
                    return;
                }

                if (messageContentRef.current !== snapshot.value) {
                    return;
                }

                applyResolvedTextareaEnterAction({
                    action: resolveTextareaEnterAction(resolvedBehavior, false),
                    handleInsertNewline,
                    snapshot,
                    submitMessage,
                });
            } finally {
                isResolvingEnterBehaviorRef.current = false;
            }
        },
        [handleInsertNewline, messageContentRef, resolveEnterBehavior, submitMessage],
    );

    /**
     * Starts async Enter-key preference resolution for a plain Enter press.
     */
    const handleUndecidedEnterBehavior = useCallback(() => {
        if (isResolvingEnterBehaviorRef.current) {
            return;
        }

        const textareaElement = textareaRef.current;
        if (!textareaElement) {
            return;
        }

        isResolvingEnterBehaviorRef.current = true;
        void resolvePendingEnterBehavior(
            createPendingTextareaEnterIntentSnapshot(textareaElement, messageContentRef.current),
        );
    }, [messageContentRef, resolvePendingEnterBehavior]);

    /**
     * Applies the shared Enter/Ctrl+Enter keybinding behavior to the textarea launcher.
     *
     * @param event - Textarea keyboard event.
     */
    const handleTextareaKeyDown = useCallback(
        (event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (shouldIgnoreTextareaEnterKeyDown(event)) {
                return;
            }

            if (shouldResolveEnterBehaviorOnDemand(enterBehavior, event.ctrlKey)) {
                event.preventDefault();
                handleUndecidedEnterBehavior();
                return;
            }

            event.preventDefault();
            applyResolvedTextareaEnterAction({
                action: resolveTextareaEnterAction(enterBehavior || 'SEND', event.ctrlKey),
                handleInsertNewline,
                submitMessage,
            });
        },
        [enterBehavior, handleInsertNewline, handleUndecidedEnterBehavior, submitMessage],
    );

    return {
        handleTextareaKeyDown,
        textareaRef,
    };
}
