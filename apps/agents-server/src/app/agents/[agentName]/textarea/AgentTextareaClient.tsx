'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { AgentProfileImage } from '../../../../components/AgentProfile/AgentProfileImage';
import { useAgentBackground } from '../../../../components/AgentProfile/useAgentBackground';
import { useAgentNaming } from '../../../../components/AgentNaming/AgentNamingContext';
import { useChatEnterBehaviorPreferences } from '../../../../components/ChatEnterBehavior/ChatEnterBehaviorPreferencesProvider';
import type { AgentsServerChatEnterBehavior } from '../../../../utils/chatEnterBehaviorSettings';

/**
 * Props for the minimal textarea-driven chat launcher.
 */
type AgentTextareaClientProps = {
    /**
     * Canonical agent identifier used to resolve chat route targets.
     */
    readonly agentName: string;

    /**
     * Human-friendly agent name rendered above the textarea.
     */
    readonly agentDisplayName: string;

    /**
     * Agent avatar URL rendered in a circular frame above the textarea.
     */
    readonly agentAvatarSrc: string;

    /**
     * Optional agent brand color used for profile-like page background.
     */
    readonly agentBrandColor?: string;

    /**
     * Placeholder rendered in the textarea input.
     */
    readonly inputPlaceholder: string;
};

/**
 * Trims user-entered content and returns non-empty message values.
 *
 * @param messageContent - Raw textarea value.
 * @returns Normalized message or `null` when empty.
 */
function resolveMessageToSend(messageContent: string): string | null {
    const normalizedMessage = messageContent.trim();
    return normalizedMessage === '' ? null : normalizedMessage;
}

/**
 * Builds chat route that triggers standard auto-execution pipeline.
 *
 * @param agentName - Canonical agent identifier.
 * @param messageContent - Message to auto-send in chat.
 * @returns Chat route with serialized query parameters.
 */
function buildChatMessageRoute(agentName: string, messageContent: string): string {
    const searchParams = new URLSearchParams();
    searchParams.set('message', messageContent);
    searchParams.set('newChat', '1');
    return `/agents/${encodeURIComponent(agentName)}/chat?${searchParams.toString()}`;
}

/**
 * Snapshot captured before the textarea waits for an unresolved Enter behavior.
 */
type PendingTextareaEnterIntentSnapshot = {
    readonly value: string;
    readonly selectionStart: number;
    readonly selectionEnd: number;
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

    return enterBehavior === 'SEND' ? 'NEWLINE' : 'SEND';
}

/**
 * Inserts plain text at the textarea's current selection.
 */
function insertTextareaTextAtSelection(params: {
    readonly currentValue: string;
    readonly insertedText: string;
    readonly selectionStart: number;
    readonly selectionEnd: number;
}): { nextValue: string; caret: number } {
    const { currentValue, insertedText, selectionStart, selectionEnd } = params;

    return {
        nextValue:
            currentValue.slice(0, selectionStart) + insertedText + currentValue.slice(selectionEnd),
        caret: selectionStart + insertedText.length,
    };
}

/**
 * Builds the inline helper text shown below the textarea.
 */
function buildKeybindingHint(enterBehavior: AgentsServerChatEnterBehavior | undefined): string {
    if (enterBehavior === 'NEWLINE') {
        return 'Enter adds a new line, Ctrl+Enter sends';
    }

    return 'Enter sends, Ctrl+Enter adds a new line';
}

/**
 * Minimal centered textarea surface that forwards prompts to the standard chat page.
 */
export function AgentTextareaClient({
    agentName,
    agentDisplayName,
    agentAvatarSrc,
    agentBrandColor,
    inputPlaceholder,
}: AgentTextareaClientProps) {
    const router = useRouter();
    const { formatText } = useAgentNaming();
    const { enterBehavior, resolveEnterBehavior } = useChatEnterBehaviorPreferences();
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [messageContent, setMessageContent] = useState('');
    const messageContentRef = useRef(messageContent);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isResolvingEnterBehaviorRef = useRef(false);
    const { backgroundImage } = useAgentBackground(agentBrandColor);

    const normalizedMessage = useMemo(() => resolveMessageToSend(messageContent), [messageContent]);
    const keybindingHint = useMemo(() => buildKeybindingHint(enterBehavior), [enterBehavior]);
    const isSubmitDisabled = isSubmitting || normalizedMessage === null;

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

    useEffect(() => {
        messageContentRef.current = messageContent;
    }, [messageContent]);

    /**
     * Submits current message and redirects to the canonical chat page.
     */
    const submitMessage = useCallback(() => {
        if (isSubmitDisabled || normalizedMessage === null) {
            return;
        }

        setIsSubmitting(true);
        setMessageContent('');
        router.push(buildChatMessageRoute(agentName, normalizedMessage));
    }, [agentName, isSubmitDisabled, normalizedMessage, router]);

    /**
     * Handles native form submit action.
     *
     * @param event - Form submit event.
     */
    const handleSubmit = useCallback(
        (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            submitMessage();
        },
        [submitMessage],
    );

    /**
     * Inserts a newline without relying on the browser's default textarea behavior.
     */
    const handleInsertNewline = useCallback((selectionStart?: number, selectionEnd?: number) => {
        const textareaElement = textareaRef.current;
        if (!textareaElement) {
            return;
        }

        const resolvedSelectionStart = selectionStart ?? textareaElement.selectionStart ?? messageContentRef.current.length;
        const resolvedSelectionEnd = selectionEnd ?? textareaElement.selectionEnd ?? resolvedSelectionStart;
        const insertion = insertTextareaTextAtSelection({
            currentValue: messageContentRef.current,
            insertedText: '\n',
            selectionStart: resolvedSelectionStart,
            selectionEnd: resolvedSelectionEnd,
        });

        setMessageContent(insertion.nextValue);

        requestAnimationFrame(() => {
            textareaElement.focus();
            textareaElement.setSelectionRange(insertion.caret, insertion.caret);
        });
    }, []);

    /**
     * Applies the shared Enter/Ctrl+Enter keybinding behavior to the textarea launcher.
     *
     * @param event - Textarea keyboard event.
     */
    const handleTextareaKeyDown = useCallback(
        (event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key !== 'Enter') {
                return;
            }

            if (isTextareaKeyboardEventComposing(event)) {
                return;
            }

            if (event.shiftKey) {
                return;
            }

            if (!enterBehavior && !event.ctrlKey) {
                event.preventDefault();

                if (isResolvingEnterBehaviorRef.current) {
                    return;
                }

                const textareaElement = textareaRef.current;
                if (!textareaElement) {
                    return;
                }

                const snapshot: PendingTextareaEnterIntentSnapshot = {
                    value: messageContentRef.current,
                    selectionStart: textareaElement.selectionStart ?? messageContentRef.current.length,
                    selectionEnd: textareaElement.selectionEnd ?? textareaElement.selectionStart ?? messageContentRef.current.length,
                };

                isResolvingEnterBehaviorRef.current = true;

                void (async () => {
                    try {
                        const resolvedBehavior = await resolveEnterBehavior();
                        if (!resolvedBehavior) {
                            return;
                        }

                        if (messageContentRef.current !== snapshot.value) {
                            return;
                        }

                        const resolvedAction = resolveTextareaEnterAction(resolvedBehavior, false);
                        if (resolvedAction === 'SEND') {
                            if (resolveMessageToSend(snapshot.value) === null) {
                                return;
                            }

                            submitMessage();
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
            const resolvedAction = resolveTextareaEnterAction(effectiveEnterBehavior, event.ctrlKey);
            event.preventDefault();

            if (resolvedAction === 'SEND') {
                submitMessage();
                return;
            }

            handleInsertNewline();
        },
        [enterBehavior, handleInsertNewline, resolveEnterBehavior, submitMessage],
    );

    return (
        <main
            className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-10"
            style={{
                background: `url("${backgroundImage}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            <form onSubmit={handleSubmit} className="w-full max-w-3xl">
                <div className="mb-6 flex flex-col items-center text-center">
                    <div className="h-24 w-24 overflow-hidden rounded-full border border-white/80 bg-white/60 shadow-lg">
                        <AgentProfileImage src={agentAvatarSrc} alt={agentDisplayName} className="h-full w-full" />
                    </div>
                    <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{agentDisplayName}</h1>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
                    <textarea
                        ref={textareaRef}
                        rows={12}
                        value={messageContent}
                        onChange={(event) => setMessageContent(event.target.value)}
                        onKeyDown={handleTextareaKeyDown}
                        disabled={isSubmitting}
                        placeholder={inputPlaceholder}
                        className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>{formatText(keybindingHint)}</span>
                        <button
                            type="submit"
                            disabled={isSubmitDisabled}
                            className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSubmitting ? formatText('Sending...') : formatText('Send')}
                        </button>
                    </div>
                </div>
            </form>
        </main>
    );
}
