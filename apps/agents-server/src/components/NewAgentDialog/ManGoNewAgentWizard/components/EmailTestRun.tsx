'use client';

import { useState } from 'react';

import { createId } from '../lib/id';
import { cn } from '../lib/cn';
import { agentTestService } from '../services/agentTestService';
import { evaluateReply, type ReplyCheck } from '../services/agentEvalService';
import type { KnowledgeItem } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { CONTROL } from './ui/Field';
import { Spinner } from './ui/Spinner';

type Phase = 'idle' | 'running' | 'done' | 'error';

type EmailTestRunProps = {
    readonly email: string;
    readonly onEmailChange: (value: string) => void;
    readonly bookSource: string;
    readonly knowledge: readonly KnowledgeItem[];
    readonly onEditBook: () => void;
};

function RunStep({
    icon,
    title,
    children,
    done,
}: {
    readonly icon: string;
    readonly title: string;
    readonly children?: React.ReactNode;
    readonly done?: boolean;
}) {
    return (
        <div className="flex gap-3 border-b border-zinc-100 py-3.5 last:border-b-0">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-base" aria-hidden>
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-zinc-800">{title}</span>
                    {done && (
                        <span className="text-[color:var(--ob-accent-600)]" aria-hidden>
                            ✓
                        </span>
                    )}
                </div>
                {children && <div className="mt-1 text-[13px] text-zinc-500">{children}</div>}
            </div>
        </div>
    );
}

export function EmailTestRun({ email, onEmailChange, bookSource, knowledge, onEditBook }: EmailTestRunProps) {
    const [phase, setPhase] = useState<Phase>('idle');
    const [reply, setReply] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [checks, setChecks] = useState<ReplyCheck[] | null>(null);
    const [checksLoading, setChecksLoading] = useState(false);

    const readyKnowledge = knowledge.filter((item) => item.status === 'ready').length;

    async function run() {
        const text = email.trim();
        if (!text || phase === 'running') {
            return;
        }
        setPhase('running');
        setReply('');
        setChecks(null);
        setError(null);

        try {
            const result = await agentTestService.send({
                bookSource,
                knowledge,
                messages: [{ id: createId(), role: 'user', content: text }],
            });
            setReply(result.content);
            setPhase('done');

            setChecksLoading(true);
            try {
                setChecks(await evaluateReply({ bookSource, customerEmail: text, reply: result.content }));
            } catch {
                setChecks([]);
            } finally {
                setChecksLoading(false);
            }
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Testovací běh selhal.');
            setPhase('error');
        }
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-[var(--ob-shadow-sm)]">
                <label htmlFor="email-test-input" className="mb-1.5 block text-[13px] font-semibold text-zinc-700">
                    Testovací vstup — e-mail od zákazníka
                </label>
                <textarea
                    id="email-test-input"
                    rows={4}
                    value={email}
                    onChange={(event) => onEmailChange(event.target.value)}
                    className={cn(CONTROL, 'resize-y')}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-zinc-400">Vlastní text, nebo klikněte na scénář vlevo.</span>
                    <Button
                        isLoading={phase === 'running'}
                        leadingIcon={<span aria-hidden>▶</span>}
                        onClick={() => void run()}
                        disabled={email.trim().length === 0}
                    >
                        Spustit testovací běh
                    </Button>
                </div>
            </div>

            {phase === 'error' && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <div className="font-medium">Testovací běh se nezdařil.</div>
                    <p className="mt-1">{error}</p>
                    <button type="button" onClick={() => void run()} className="mt-1 font-medium underline underline-offset-2">
                        Zkusit znovu
                    </button>
                </div>
            )}

            {(phase === 'running' || phase === 'done') && (
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[var(--ob-shadow-md)]">
                    <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50/80 px-4 py-2.5 text-[13px] font-medium text-zinc-600">
                        <span className="relative flex h-2 w-2" aria-hidden>
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        Záznam testovacího běhu
                        <span className="ml-auto">
                            <Badge tone="success" dot>
                                Naživo
                            </Badge>
                        </span>
                    </div>

                    <div className="px-4">
                        <RunStep icon="📨" title="Vstup přijat: e-mail zákazníka" done>
                            E-mail předán agentovi ke zpracování.
                        </RunStep>
                        <RunStep icon="🧠" title="Prohledání znalostí" done>
                            {readyKnowledge > 0
                                ? `${readyKnowledge} ${readyKnowledge === 1 ? 'zdroj' : 'zdroje/ů'} připojeno k agentovi.`
                                : 'Bez znalostní báze — agent vychází jen z booku.'}
                        </RunStep>
                        <RunStep icon="✍️" title="Návrh odpovědi">
                            {phase === 'running' ? (
                                <span className="inline-flex items-center gap-2 text-zinc-500">
                                    <Spinner className="h-4 w-4" /> Generuji odpověď…
                                </span>
                            ) : (
                                <>
                                    <div className="mt-1 whitespace-pre-wrap rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-[13px] leading-relaxed text-zinc-700">
                                        {reply}
                                    </div>
                                    <p className="mt-2 text-[11px] text-zinc-400">
                                        Toto je návrh — agent nic neodesílá, odpověď schvaluje operátor.
                                    </p>
                                </>
                            )}
                        </RunStep>
                    </div>

                    {phase === 'done' && (
                        <div className="border-t border-zinc-200 bg-zinc-50/60 px-4 py-3.5">
                            <div className="mb-2 text-xs font-semibold text-zinc-500">Kontroly výsledku</div>
                            {checksLoading ? (
                                <div className="flex items-center gap-2 text-[13px] text-zinc-500">
                                    <Spinner className="h-4 w-4" /> Hodnotím odpověď proti booku…
                                </div>
                            ) : checks && checks.length > 0 ? (
                                <ul className="space-y-1.5">
                                    {checks.map((check, index) => (
                                        <li
                                            key={index}
                                            className={cn(
                                                'flex items-start gap-2 text-[13px]',
                                                check.status === 'ok' ? 'text-emerald-700' : 'text-amber-700',
                                            )}
                                        >
                                            <span aria-hidden>{check.status === 'ok' ? '✓' : '⚠'}</span>
                                            <span>{check.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-[13px] text-zinc-400">Bez připomínek.</div>
                            )}

                            <div className="mt-3 flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={onEditBook}>
                                    ✏️ Upravit book
                                </Button>
                                <Button variant="ghost" size="sm" leadingIcon={<span aria-hidden>↻</span>} onClick={() => void run()}>
                                    Spustit znovu
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
