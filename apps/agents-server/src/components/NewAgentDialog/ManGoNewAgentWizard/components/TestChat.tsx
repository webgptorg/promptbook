'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { ChatMessage } from '../types';
import { cn } from '../lib/cn';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { CONTROL } from './ui/Field';

const GREETING = '👋 Jsem připravený. Vložte zadání — třeba popis e-mailu od zákazníka — a ukážu vám, jak odpovím.';

type TestChatProps = {
    readonly messages: readonly ChatMessage[];
    readonly isSending: boolean;
    readonly onSend: (text: string) => void;
    readonly onStop?: () => void;
    readonly onRetry?: () => void;
};

function Bubble({
    role,
    children,
    footer,
}: {
    readonly role: 'user' | 'agent';
    readonly children: ReactNode;
    readonly footer?: ReactNode;
}) {
    return (
        <div className={cn('group flex max-w-[85%] flex-col gap-1', role === 'user' ? 'items-end self-end' : 'items-start self-start')}>
            <div
                className={cn(
                    'whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                    role === 'user'
                        ? 'rounded-br-sm bg-[color:var(--ob-accent-600)] text-white shadow-[var(--ob-shadow-accent)]'
                        : 'rounded-bl-sm bg-zinc-100 text-zinc-800',
                )}
            >
                {children}
            </div>
            {footer}
        </div>
    );
}

export function TestChat({ messages, isSending, onSend, onStop, onRetry }: TestChatProps) {
    const [text, setText] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, isSending]);

    function submit() {
        const trimmed = text.trim();
        if (!trimmed || isSending) {
            return;
        }
        onSend(trimmed);
        setText('');
    }

    function copy(id: string, content: string) {
        void navigator.clipboard?.writeText(content).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
        });
    }

    const lastMessage = messages[messages.length - 1];
    const isRetryShown = Boolean(onRetry) && !isSending && lastMessage?.role === 'agent';

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[var(--ob-shadow-md)]">
            <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50/80 px-4 py-2.5 text-[13px] font-medium text-zinc-600">
                <span className="relative flex h-2 w-2" aria-hidden>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Testovací prostředí
                <span className="ml-auto">
                    <Badge tone="success" dot>
                        Naživo
                    </Badge>
                </span>
            </div>

            <div ref={scrollRef} className="flex max-h-[420px] min-h-[300px] flex-1 flex-col gap-3.5 overflow-y-auto p-4">
                <Bubble role="agent">{GREETING}</Bubble>
                {messages.map((message) =>
                    message.role === 'agent' ? (
                        <Bubble
                            key={message.id}
                            role="agent"
                            footer={
                                <button
                                    type="button"
                                    onClick={() => copy(message.id, message.content)}
                                    className="text-[11px] font-medium text-zinc-400 opacity-0 transition-opacity hover:text-zinc-700 focus-visible:opacity-100 group-hover:opacity-100"
                                >
                                    {copiedId === message.id ? '✓ Zkopírováno' : 'Kopírovat'}
                                </button>
                            }
                        >
                            {message.content}
                        </Bubble>
                    ) : (
                        <Bubble key={message.id} role="user">
                            {message.content}
                        </Bubble>
                    ),
                )}
                {isSending && (
                    <Bubble role="agent">
                        <span className="inline-flex gap-1">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.2s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.1s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
                        </span>
                    </Bubble>
                )}
                {isRetryShown && (
                    <button
                        type="button"
                        onClick={onRetry}
                        className="mx-auto mt-1 inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ob-ring)]"
                    >
                        <span aria-hidden>↻</span> Zkusit znovu
                    </button>
                )}
            </div>

            <div className="flex gap-2 border-t border-zinc-200 bg-zinc-50/50 p-3">
                <input
                    type="text"
                    value={text}
                    aria-label="Testovací zadání pro agenta"
                    placeholder="Vložte testovací zadání pro agenta…"
                    disabled={isSending}
                    onChange={(event) => setText(event.target.value)}
                    onKeyDown={(event) => event.key === 'Enter' && submit()}
                    className={cn(CONTROL, 'py-2 disabled:opacity-60')}
                />
                {isSending ? (
                    <Button variant="outline" size="sm" onClick={onStop}>
                        Stop
                    </Button>
                ) : (
                    <Button size="sm" onClick={submit} disabled={text.trim().length === 0}>
                        Odeslat
                    </Button>
                )}
            </div>
        </div>
    );
}
