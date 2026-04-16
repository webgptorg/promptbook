'use client';

import { MessageCircle, SendHorizontal, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Dialog } from '../../../components/Portal/Dialog';
import { useServerLanguage } from '../../../components/ServerLanguage/ServerLanguageProvider';
import { useDirtyModalGuard } from '../../../components/utils/useDirtyModalGuard';
import type { PseudoUserConversationEntry } from './useAgentChatPseudoUserInteraction';

/**
 * Props for pseudo-user chat dialog shown when agent talks to `{User}`.
 */
export type PseudoUserChatDialogProps = {
    /**
     * Controls dialog visibility.
     */
    readonly isOpen: boolean;
    /**
     * Prompt text coming from the agent.
     */
    readonly prompt: string;
    /**
     * Display name of the speaking agent.
     */
    readonly agentName: string;
    /**
     * Display name of the human participant.
     */
    readonly userName: string;
    /**
     * Mocked internal transcript rendered before the real reply form.
     */
    readonly conversation: ReadonlyArray<PseudoUserConversationEntry>;
    /**
     * Called with one user reply and then closes the dialog.
     */
    readonly onSubmit: (message: string) => Promise<void> | void;
    /**
     * Called when the dialog is dismissed without sending.
     */
    readonly onClose: () => void;
};

/**
 * Trims and validates one pseudo-user reply message.
 *
 * @param value - Raw text from textarea.
 * @returns Clean message or empty string when invalid.
 */
function normalizeUserReply(value: string): string {
    return value.trim();
}

/**
 * Dialog that asks the real user for exactly one reply to a `{User}` pseudo-agent prompt.
 */
export function PseudoUserChatDialog(props: PseudoUserChatDialogProps) {
    const { isOpen, prompt, agentName, userName, conversation, onSubmit, onClose } = props;
    const [reply, setReply] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputId = useId();
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const { t } = useServerLanguage();
    const { requestClose } = useDirtyModalGuard({
        hasUnsavedChanges: reply.length > 0,
        isCloseBlocked: isSubmitting,
        onClose,
    });
    const displayedConversation =
        conversation.length > 0
            ? conversation
            : [
                  {
                      sender: 'AGENT' as const,
                      name: agentName,
                      content: prompt,
                  },
              ];

    useEffect(() => {
        if (!isOpen) {
            setReply('');
            setIsSubmitting(false);
            return;
        }

        requestAnimationFrame(() => {
            textareaRef.current?.focus();
        });
    }, [isOpen]);

    if (!isOpen) {
        return null;
    }

    return (
        <Dialog onClose={requestClose} className="w-full max-w-xl p-0 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                            <MessageCircle className="h-4 w-4" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">{t('pseudoUserChat.headerTitle')}</p>
                            <p className="text-xs text-gray-500">{t('pseudoUserChat.headerSubtitle')}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={requestClose}
                        disabled={isSubmitting}
                        className="rounded-md p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={t('pseudoUserChat.closeAriaLabel')}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-4 px-5 py-5">
                <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
                    {displayedConversation.map(({ sender, name, content }, index) => {
                        const isAgentMessage = sender === 'AGENT';

                        return (
                            <div key={`${sender}-${name}-${index}`} className={`flex ${isAgentMessage ? 'justify-start' : 'justify-end'}`}>
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                        isAgentMessage
                                            ? 'rounded-tl-sm bg-blue-50 text-blue-950'
                                            : 'rounded-tr-sm border border-gray-200 bg-white text-gray-900'
                                    }`}
                                >
                                    <p
                                        className={`mb-1 text-xs font-semibold uppercase tracking-wide ${
                                            isAgentMessage ? 'text-blue-700' : 'text-gray-500'
                                        }`}
                                    >
                                        {name}
                                    </p>
                                    <p className="whitespace-pre-wrap">{content}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <form
                    className="space-y-3"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        const normalizedReply = normalizeUserReply(reply);
                        if (!normalizedReply || isSubmitting) {
                            return;
                        }

                        setIsSubmitting(true);
                        try {
                            await onSubmit(normalizedReply);
                            setReply('');
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                >
                    <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {t('pseudoUserChat.replyLabel', { userName })}
                    </label>
                    <textarea
                        id={inputId}
                        ref={textareaRef}
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        placeholder={t('pseudoUserChat.replyPlaceholder')}
                        rows={4}
                        disabled={isSubmitting}
                        className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                    />

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={requestClose}
                            disabled={isSubmitting}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {t('pseudoUserChat.cancelLabel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!normalizeUserReply(reply) || isSubmitting}
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <SendHorizontal className="h-4 w-4" />
                            {t('pseudoUserChat.sendReplyLabel')}
                        </button>
                    </div>
                </form>
            </div>
        </Dialog>
    );
}
