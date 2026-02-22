'use client';

import { MessageCircle, SendHorizontal, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Dialog } from '../../../components/Portal/Dialog';

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
    const { isOpen, prompt, agentName, userName, onSubmit, onClose } = props;
    const [reply, setReply] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputId = useId();
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
        <Dialog onClose={isSubmitting ? () => undefined : onClose} className="w-full max-w-xl p-0 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                            <MessageCircle className="h-4 w-4" />
                        </span>
                        <div>
                            <p className="text-sm font-semibold text-gray-900">Agent asks you directly</p>
                            <p className="text-xs text-gray-500">One reply only</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="rounded-md p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="space-y-4 px-5 py-5">
                <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-blue-50 px-4 py-3 text-sm text-blue-950 shadow-sm">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-700">{agentName}</p>
                        <p className="whitespace-pre-wrap">{prompt}</p>
                    </div>
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
                        {userName} reply
                    </label>
                    <textarea
                        id={inputId}
                        ref={textareaRef}
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        placeholder="Write one reply for the agent..."
                        rows={4}
                        disabled={isSubmitting}
                        className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-gray-100"
                    />

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!normalizeUserReply(reply) || isSubmitting}
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <SendHorizontal className="h-4 w-4" />
                            Send reply
                        </button>
                    </div>
                </form>
            </div>
        </Dialog>
    );
}
