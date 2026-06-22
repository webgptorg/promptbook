'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ONBOARDING_ENTRY_PATH, ONBOARDING_STEPS } from '../../config/steps';
import { useManGoOnboardingNavigation } from '../../ManGoOnboardingNavigation';
import { generateBookDraft } from '../../services/draftService';
import { useOnboarding } from '../../state/OnboardingProvider';
import { BookLanguagePanel } from '../BookLanguagePanel';
import { MarkdownBookEditor } from '../MarkdownBookEditor';
import { StepFooter, StepHeader } from '../StepFrame';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';

type Phase = 'init' | 'generating' | 'ready' | 'error';

export function BookStep() {
    const { navigateToPath } = useManGoOnboardingNavigation();
    const { state, isHydrated, update } = useOnboarding();
    const [phase, setPhase] = useState<Phase>('init');
    const [error, setError] = useState<string | null>(null);
    const startedRef = useRef(false);

    const isBriefAvailable = state.agentName.trim().length > 0 && state.agentBrief.trim().length > 0;

    const generate = useCallback(async () => {
        setPhase('generating');
        setError(null);
        try {
            const draft = await generateBookDraft({ agentName: state.agentName, agentBrief: state.agentBrief });
            update({ bookSource: draft });
            setPhase('ready');
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : 'Generování draftu selhalo.');
            setPhase('error');
        }
    }, [state.agentName, state.agentBrief, update]);

    // Generate the draft once, after hydration completes — so we read the persisted
    // name/brief rather than the initial empty state. Runs a single time (startedRef),
    // reading the latest values from the closure captured when hydration flips true.
    useEffect(() => {
        if (!isHydrated || startedRef.current) {
            return;
        }
        startedRef.current = true;

        if (state.bookSource.trim().length > 0) {
            setPhase('ready');
        } else if (isBriefAvailable) {
            void generate();
        } else {
            setPhase('ready');
        }
    }, [generate, isBriefAvailable, isHydrated, state.bookSource]);

    if (phase === 'init' || phase === 'generating') {
        return (
            <div className="mx-auto max-w-2xl">
                <StepHeader eyebrow="Definice agenta" title="Připravujeme draft booku" />
                <Card variant="elevated" className="flex flex-col items-center justify-center gap-5 px-8 py-20 text-center">
                    <span className="relative flex h-14 w-14 items-center justify-center">
                        <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--ob-accent-200)] opacity-60" />
                        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--ob-accent-50)]">
                            <Spinner className="h-7 w-7" />
                        </span>
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-zinc-800">Čtu vaše zadání a píšu draft book.md…</p>
                        <p className="mt-1 text-xs text-zinc-400">Chvíli to může trvat — generuje skutečný model.</p>
                    </div>
                </Card>
            </div>
        );
    }

    const isContinueEnabled = state.bookSource.trim().length > 0;

    return (
        <div className="mx-auto max-w-4xl">
            <StepHeader
                eyebrow="Definice agenta"
                title="Draft booku je hotový"
                subtitle="Je to jen výchozí návrh — cokoli přepište, smažte nebo doplňte, klidně přímo na schůzce s klientem."
            />

            {phase === 'error' && (
                <Banner tone="warning" title="Draft se nepodařilo vygenerovat." className="mb-5">
                    <p>{error}</p>
                    <p className="mt-1">Book můžete napsat i ručně níže, nebo to zkuste znovu.</p>
                </Banner>
            )}

            {!isBriefAvailable && state.bookSource.trim().length === 0 && phase !== 'error' && (
                <Banner tone="info" className="mb-5">
                    Nejprve vyplňte zadání, ať můžeme draft vygenerovat — nebo book napište ručně níže.{' '}
                    <button
                        type="button"
                        className="font-semibold text-[color:var(--ob-accent-700)] underline underline-offset-2 hover:text-[color:var(--ob-accent-800)]"
                        onClick={() => navigateToPath(ONBOARDING_ENTRY_PATH)}
                    >
                        Zpět na zadání
                    </button>
                </Banner>
            )}

            <MarkdownBookEditor
                value={state.bookSource}
                onChange={(value) => update({ bookSource: value })}
                onRegenerate={isBriefAvailable ? () => void generate() : undefined}
            />

            {state.bookSource.trim().length > 0 && <BookLanguagePanel source={state.bookSource} />}

            <StepFooter
                left={
                    <Button variant="ghost" onClick={() => navigateToPath(ONBOARDING_ENTRY_PATH)}>
                        ← Zadání
                    </Button>
                }
                right={
                    <Button
                        disabled={!isContinueEnabled}
                        trailingIcon={<span aria-hidden>→</span>}
                        onClick={() => navigateToPath(ONBOARDING_STEPS[1].path)}
                    >
                        Pokračovat: Znalosti
                    </Button>
                }
            />
        </div>
    );
}
