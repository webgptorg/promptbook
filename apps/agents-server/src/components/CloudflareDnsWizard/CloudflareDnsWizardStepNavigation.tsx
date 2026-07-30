'use client';

import type { CLOUDFLARE_DNS_WIZARD_STEPS, CloudflareDnsWizardStep } from './CloudflareDnsWizardSteps';

/**
 * Renders the selectable progression for the Cloudflare DNS setup wizard.
 *
 * @private used by the Cloudflare DNS setup wizard
 */
export function CloudflareDnsWizardStepNavigation({
    currentStep,
    onStepChange,
    steps,
}: {
    /**
     * Step currently visible to the administrator.
     */
    readonly currentStep: CloudflareDnsWizardStep;

    /**
     * Updates the currently visible wizard step.
     */
    readonly onStepChange: (step: CloudflareDnsWizardStep) => void;

    /**
     * Steps available for the shown records.
     */
    readonly steps: typeof CLOUDFLARE_DNS_WIZARD_STEPS;
}) {
    return (
        <div className="flex flex-wrap gap-2" aria-label="Cloudflare setup steps">
            {steps.map((step) => {
                const isCurrentStep = currentStep === step.id;

                return (
                    <button
                        key={step.id}
                        type="button"
                        aria-current={isCurrentStep ? 'step' : undefined}
                        onClick={() => onStepChange(step.id)}
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                            isCurrentStep
                                ? 'bg-amber-700 text-white shadow-sm'
                                : 'border border-amber-200 bg-white text-amber-800 hover:bg-amber-100'
                        }`}
                    >
                        {step.label}
                    </button>
                );
            })}
        </div>
    );
}
