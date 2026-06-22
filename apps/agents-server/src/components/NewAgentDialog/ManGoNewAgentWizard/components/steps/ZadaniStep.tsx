'use client';

import { ONBOARDING_STEPS } from '../../config/steps';
import { useManGoOnboardingNavigation } from '../../ManGoOnboardingNavigation';
import { useOnboarding } from '../../state/OnboardingProvider';
import { SectionLabel, StepCard, StepFooter } from '../StepFrame';
import { Button } from '../ui/Button';
import { InputField, TextareaField } from '../ui/Field';

/**
 * Entry screen of the wizard ("Řekněte mi o agentovi"). Captures the agent name + a
 * one-sentence brief, then continues to the Book step where the draft is generated.
 */
export function ZadaniStep() {
    const { navigateToPath } = useManGoOnboardingNavigation();
    const { state, update } = useOnboarding();
    const isContinueEnabled = state.agentName.trim().length > 0 && state.agentBrief.trim().length > 0;

    return (
        <div className="mx-auto max-w-2xl">
            <StepCard>
                <SectionLabel className="text-[color:var(--ob-accent-600)]">Začněme</SectionLabel>
                <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-tight text-zinc-900">
                    Řekněte mi o agentovi
                </h1>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-500">
                    Stačí název a jedna věta o tom, co má agent dělat. Z toho připravíme draft booku, který si pak
                    libovolně upravíte.
                </p>

                <div className="mt-8 space-y-6">
                    <InputField
                        label="Název agenta"
                        placeholder="např. E-mail asistent pro Alzu"
                        value={state.agentName}
                        hint="Vyberte název srozumitelný pro klienta, ne pro technika."
                        onChange={(event) => update({ agentName: event.target.value })}
                    />
                    <TextareaField
                        label="Co má agent dělat?"
                        labelSuffix={<span className="font-normal text-zinc-400">(jedna věta stačí)</span>}
                        rows={2}
                        placeholder="např. Pomáhá zákaznickému servisu odpovídat na příchozí e-maily od zákazníků."
                        value={state.agentBrief}
                        onChange={(event) => update({ agentBrief: event.target.value })}
                    />
                </div>

                <StepFooter
                    right={
                        <Button
                            disabled={!isContinueEnabled}
                            leadingIcon={<span aria-hidden>✨</span>}
                            trailingIcon={<span aria-hidden>→</span>}
                            onClick={() => navigateToPath(ONBOARDING_STEPS[0].path)}
                        >
                            Vygenerovat draft booku
                        </Button>
                    }
                />
            </StepCard>
        </div>
    );
}
