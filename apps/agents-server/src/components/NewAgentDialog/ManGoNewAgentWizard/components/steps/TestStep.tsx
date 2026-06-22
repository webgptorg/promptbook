'use client';

import { useRef, useState } from 'react';

import { EMAIL_SCENARIOS } from '../../config/emailScenarios';
import { ONBOARDING_STEPS } from '../../config/steps';
import { createId } from '../../lib/id';
import { cn } from '../../lib/cn';
import { agentTestService } from '../../services/agentTestService';
import { useManGoOnboardingNavigation } from '../../ManGoOnboardingNavigation';
import { useOnboarding } from '../../state/OnboardingProvider';
import type { ChatMessage } from '../../types';
import { EmailTestRun } from '../EmailTestRun';
import { SectionLabel, StepFooter, StepHeader } from '../StepFrame';
import { TestChat } from '../TestChat';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type TestMode = 'email' | 'chat';

const SAMPLE_PROMPTS = [
    'Zákazník reklamuje zboží, které přišlo poškozené.',
    'Zákazník se ptá, proč mu nedorazilo zboží objednané před 3 dny.',
];

export function TestStep() {
    const { navigateToPath } = useManGoOnboardingNavigation();
    const { state, update } = useOnboarding();

    const [mode, setMode] = useState<TestMode>('email');
    const [email, setEmail] = useState(EMAIL_SCENARIOS[1].email);

    const [isSending, setIsSending] = useState(false);
    const requestRef = useRef(0);

    async function runAgent(history: readonly ChatMessage[]) {
        const requestId = (requestRef.current += 1);
        setIsSending(true);
        try {
            const reply = await agentTestService.send({
                bookSource: state.bookSource,
                knowledge: state.knowledge,
                messages: history,
            });
            if (requestRef.current !== requestId) {
                return;
            }
            update((prev) => ({
                testMessages: [...prev.testMessages, { id: createId(), role: 'agent', content: reply.content }],
            }));
        } catch {
            if (requestRef.current !== requestId) {
                return;
            }
            update((prev) => ({
                testMessages: [
                    ...prev.testMessages,
                    { id: createId(), role: 'agent', content: 'Omlouvám se, něco se pokazilo. Zkuste to prosím znovu.' },
                ],
            }));
        } finally {
            if (requestRef.current === requestId) {
                setIsSending(false);
            }
        }
    }

    function send(text: string) {
        const trimmed = text.trim();
        if (!trimmed || isSending) {
            return;
        }
        const history = [...state.testMessages, { id: createId(), role: 'user' as const, content: trimmed }];
        update(() => ({ testMessages: history }));
        void runAgent(history);
    }

    function retry() {
        if (isSending) {
            return;
        }
        const messages = state.testMessages;
        let lastUser = -1;
        for (let index = messages.length - 1; index >= 0; index -= 1) {
            if (messages[index].role === 'user') {
                lastUser = index;
                break;
            }
        }
        if (lastUser < 0) {
            return;
        }
        const history = messages.slice(0, lastUser + 1);
        update(() => ({ testMessages: history }));
        void runAgent(history);
    }

    function stop() {
        requestRef.current += 1;
        setIsSending(false);
    }

    const agentName = state.agentName.trim() || 'Nepojmenovaný agent';
    const readyKnowledge = state.knowledge.filter((item) => item.status === 'ready').length;
    const isRetryAvailable = !isSending && state.testMessages.some((message) => message.role === 'user');

    return (
        <div className="mx-auto max-w-4xl">
            <StepHeader
                eyebrow="Ověření agenta"
                title="Otestujte agenta"
                subtitle="Vyzkoušejte, jak agent reaguje na reálná zadání. Odpovídá naživo přes model — je to testovací režim, nic se zákazníkům neodesílá."
            />

            <div className="mb-6">
                <ModeToggle mode={mode} onChange={setMode} />
            </div>

            <div className="grid items-start gap-6 md:grid-cols-[1fr_1.4fr]">
                <div className="space-y-4">
                    <Card className="p-5">
                        <SectionLabel className="mb-3">Konfigurace agenta</SectionLabel>
                        <div className="text-sm font-bold text-zinc-900">{agentName}</div>
                        <div className="mt-4 space-y-2.5 border-t border-zinc-100 pt-4 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500">Book</span>
                                <button
                                    type="button"
                                    onClick={() => navigateToPath(ONBOARDING_STEPS[0].path)}
                                    className="inline-flex items-center gap-1 rounded-full bg-[color:var(--ob-accent-50)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--ob-accent-700)] transition-colors hover:bg-[color:var(--ob-accent-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ob-ring)]"
                                >
                                    <span aria-hidden>✏️</span> Upravit
                                </button>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500">Znalosti</span>
                                <Badge tone={readyKnowledge > 0 ? 'success' : 'neutral'} dot={readyKnowledge > 0}>
                                    {readyKnowledge} {readyKnowledge === 1 ? 'zdroj' : 'zdroje/ů'}
                                </Badge>
                            </div>
                        </div>
                    </Card>

                    {mode === 'email' ? (
                        <div>
                            <div className="mb-2 text-[13px] font-semibold text-zinc-600">Simulace vstupu:</div>
                            <div className="space-y-2">
                                {EMAIL_SCENARIOS.map((scenario) => (
                                    <button
                                        key={scenario.id}
                                        type="button"
                                        onClick={() => setEmail(scenario.email)}
                                        className="flex w-full items-start gap-2.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-left shadow-[var(--ob-shadow-xs)] transition-all hover:-translate-y-px hover:border-[color:var(--ob-accent-300)] hover:shadow-[var(--ob-shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ob-ring)]"
                                    >
                                        <span className="text-base" aria-hidden>
                                            {scenario.icon}
                                        </span>
                                        <span>
                                            <span className="block text-[13px] font-semibold text-zinc-800">
                                                {scenario.label}
                                            </span>
                                            <span className="block text-[11px] text-zinc-400">
                                                Vzorový e-mail — předvyplní vstup
                                            </span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="mb-2 text-[13px] font-semibold text-zinc-600">Zkuste zadat:</div>
                            <div className="space-y-2">
                                {SAMPLE_PROMPTS.map((prompt) => (
                                    <button
                                        key={prompt}
                                        type="button"
                                        disabled={isSending}
                                        onClick={() => send(prompt)}
                                        className="group flex w-full items-start gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-left text-[13px] leading-relaxed text-zinc-600 shadow-[var(--ob-shadow-xs)] transition-all hover:-translate-y-px hover:border-[color:var(--ob-accent-300)] hover:text-zinc-900 hover:shadow-[var(--ob-shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ob-ring)] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <span
                                            className="mt-0.5 text-[color:var(--ob-accent-400)] transition-colors group-hover:text-[color:var(--ob-accent-600)]"
                                            aria-hidden
                                        >
                                            ↳
                                        </span>
                                        <span>„{prompt}“</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {mode === 'email' ? (
                    <EmailTestRun
                        email={email}
                        onEmailChange={setEmail}
                        bookSource={state.bookSource}
                        knowledge={state.knowledge}
                        onEditBook={() => navigateToPath(ONBOARDING_STEPS[0].path)}
                    />
                ) : (
                    <TestChat
                        messages={state.testMessages}
                        isSending={isSending}
                        onSend={send}
                        onStop={stop}
                        onRetry={isRetryAvailable ? retry : undefined}
                    />
                )}
            </div>

            <StepFooter
                left={
                    <Button variant="ghost" onClick={() => navigateToPath(ONBOARDING_STEPS[1].path)}>
                        ← Znalosti
                    </Button>
                }
                right={
                    <Button trailingIcon={<span aria-hidden>→</span>} onClick={() => navigateToPath(ONBOARDING_STEPS[3].path)}>
                        Uložit první verzi
                    </Button>
                }
            />
        </div>
    );
}

function ModeToggle({ mode, onChange }: { readonly mode: TestMode; readonly onChange: (mode: TestMode) => void }) {
    const options: ReadonlyArray<{ id: TestMode; label: string; icon: string }> = [
        { id: 'email', label: 'E-mailový test', icon: '📨' },
        { id: 'chat', label: 'Konverzace', icon: '💬' },
    ];
    return (
        <div className="inline-flex rounded-xl border border-zinc-200 bg-white p-0.5 shadow-[var(--ob-shadow-xs)]" role="tablist" aria-label="Režim testu">
            {options.map((option) => {
                const isActive = option.id === mode;
                return (
                    <button
                        key={option.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(option.id)}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ob-ring)]',
                            isActive
                                ? 'bg-[color:var(--ob-accent-600)] text-white'
                                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800',
                        )}
                    >
                        <span aria-hidden>{option.icon}</span>
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
