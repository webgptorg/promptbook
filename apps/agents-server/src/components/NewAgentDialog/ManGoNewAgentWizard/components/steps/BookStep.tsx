'use client';

import { useEffect } from 'react';

import { ONBOARDING_ENTRY_PATH, ONBOARDING_STEPS } from '../../config/steps';
import { useManGoOnboardingNavigation } from '../../ManGoOnboardingNavigation';
import { useOnboarding } from '../../state/OnboardingProvider';
import { ManGoBookEditor } from '../ManGoBookEditor';
import { StepFooter, StepHeader } from '../StepFrame';
import { Banner } from '../ui/Banner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Spinner } from '../ui/Spinner';

/** Edits the active draft and requests deliberate Book replacement through the existing service. */
export function BookStep() {
    const { navigateToPath } = useManGoOnboardingNavigation();
    const { state, update, actions } = useOnboarding();
    const { phase, error } = state.bookGeneration;
    const isBriefAvailable = state.agentName.trim().length > 0 && state.agentBrief.trim().length > 0;

    // The host resolves ownership before mounting. Navigation retains edits and pending work;
    // synchronous session state also prevents duplicate generation during Strict Mode replay.
    useEffect(() => {
        if (phase !== 'init') {
            return;
        }
        if (!state.bookSource.trim() && isBriefAvailable) {
            void actions.generate();
        } else {
            update({ bookGeneration: { phase: 'ready', error: null } });
        }
    }, [actions, isBriefAvailable, phase, state.bookSource, update]);

    if (phase === 'init' || phase === 'generating') {
        return (
            <div className="mx-auto max-w-2xl">
                <StepHeader eyebrow="Definice agenta" title="Generujeme book" />
                <Card
                    variant="elevated"
                    className="flex flex-col items-center justify-center gap-5 px-8 py-20 text-center"
                >
                    <span className="relative flex h-14 w-14 items-center justify-center">
                        <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--ob-accent-200)] opacity-60" />
                        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--ob-accent-50)]">
                            <Spinner className="h-7 w-7" />
                        </span>
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-zinc-800">Čtu vaše zadání a píšu book…</p>
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
                title="Book je připravený"
                subtitle="Je to výchozí verze — cokoli přepište, smažte nebo doplňte přímo v editoru booku."
            />

            {phase === 'error' && (
                <Banner tone="warning" title="Book se nepodařilo vygenerovat." className="mb-5">
                    <p>{error}</p>
                    <p className="mt-1">Book můžete napsat i ručně níže, nebo to zkuste znovu.</p>
                </Banner>
            )}

            {!isBriefAvailable && state.bookSource.trim().length === 0 && phase !== 'error' && (
                <Banner tone="info" className="mb-5">
                    Nejprve vyplňte zadání, ať můžeme book vygenerovat — nebo book napište ručně níže.{' '}
                    <button
                        type="button"
                        className="font-semibold text-[color:var(--ob-accent-700)] underline underline-offset-2 hover:text-[color:var(--ob-accent-800)]"
                        onClick={() => navigateToPath(ONBOARDING_ENTRY_PATH)}
                    >
                        Zpět na zadání
                    </button>
                </Banner>
            )}

            <ManGoBookEditor
                value={state.bookSource}
                onChange={(value) => update({ bookSource: value })}
                onRegenerate={isBriefAvailable ? () => void actions.generate() : undefined}
            />

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
