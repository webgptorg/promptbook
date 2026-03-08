'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAgentNaming } from '../../../../components/AgentNaming/AgentNamingContext';

/**
 * Props for the minimal textarea-driven chat launcher.
 */
type AgentTextareaClientProps = {
    /**
     * Canonical agent identifier used to resolve chat route targets.
     */
    readonly agentName: string;
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
 * Minimal centered textarea surface that forwards prompts to the standard chat page.
 */
export function AgentTextareaClient({ agentName }: AgentTextareaClientProps) {
    const router = useRouter();
    const { formatText } = useAgentNaming();
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [messageContent, setMessageContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const normalizedMessage = useMemo(() => resolveMessageToSend(messageContent), [messageContent]);
    const isSubmitDisabled = isSubmitting || normalizedMessage === null;

    useEffect(() => {
        textareaRef.current?.focus();
    }, []);

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
     * Sends on Enter and allows multiline input with Shift+Enter.
     *
     * @param event - Textarea keyboard event.
     */
    const handleTextareaKeyDown = useCallback(
        (event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key !== 'Enter' || event.shiftKey) {
                return;
            }

            event.preventDefault();
            submitMessage();
        },
        [submitMessage],
    );

    return (
        <main className="flex min-h-[calc(100dvh-60px)] w-full items-center justify-center px-4 py-10">
            <form onSubmit={handleSubmit} className="w-full max-w-3xl">
                <div className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
                    <textarea
                        ref={textareaRef}
                        rows={12}
                        value={messageContent}
                        onChange={(event) => setMessageContent(event.target.value)}
                        onKeyDown={handleTextareaKeyDown}
                        disabled={isSubmitting}
                        placeholder={formatText('Write your message to the agent...')}
                        className="w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-base text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span>{formatText('Enter to send, Shift+Enter for newline')}</span>
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
