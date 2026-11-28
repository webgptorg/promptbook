import { Fragment } from 'react';

import { ONBOARDING_FLOW } from '../config/steps';
import { cn } from '../lib/cn';
import { useManGoOnboardingNavigation } from '../ManGoOnboardingNavigation';

type StepStatus = 'done' | 'active' | 'upcoming';

function statusFor(index: number, activeIndex: number): StepStatus {
    if (index < activeIndex) {
        return 'done';
    }
    return index === activeIndex ? 'active' : 'upcoming';
}

function Check() {
    return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 8.5l3 3 6-7" />
        </svg>
    );
}

const DOT_BASE = 'flex flex-shrink-0 items-center justify-center rounded-full transition-all duration-300';

function dotClass(status: StepStatus): string {
    return cn(
        DOT_BASE,
        status === 'active' &&
            'bg-[color:var(--ob-brand-blue)] text-[color:var(--ob-ink)] font-bold shadow-[0_0_0_4px_rgba(122,235,255,0.20)]',
        status === 'done' && 'bg-white/20 text-white',
        status === 'upcoming' && 'border-2 border-white/40 text-white/60',
    );
}

/** Wizard progress shown inside the accent rail — clickable so steps double as navigation.
 * Vertical on desktop, a compact row on mobile. */
export function RailStepper({
    activeIndex,
    orientation = 'vertical',
}: {
    readonly activeIndex: number;
    readonly orientation?: 'vertical' | 'horizontal';
}) {
    const { navigateToPath } = useManGoOnboardingNavigation();

    if (orientation === 'horizontal') {
        return (
            <ol className="flex items-center" aria-label="Průběh onboardingu">
                {ONBOARDING_FLOW.map((step, index) => {
                    const status = statusFor(index, activeIndex);
                    const isLast = index === ONBOARDING_FLOW.length - 1;
                    return (
                        <Fragment key={step.id}>
                            <li>
                                <button
                                    type="button"
                                    onClick={() => navigateToPath(step.path)}
                                    aria-current={status === 'active' ? 'step' : undefined}
                                    className="flex items-center gap-2 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                                >
                                    <span className={cn(dotClass(status), 'h-6 w-6 text-[11px]')}>
                                        {status === 'done' ? <Check /> : index + 1}
                                    </span>
                                    <span
                                        className={cn(
                                            'whitespace-nowrap text-[13px] font-medium text-white',
                                            status !== 'active' && 'hidden',
                                        )}
                                    >
                                        {step.label}
                                    </span>
                                </button>
                            </li>
                            {!isLast && <span aria-hidden className="mx-1 h-px w-3.5 bg-white/30" />}
                        </Fragment>
                    );
                })}
            </ol>
        );
    }

    return (
        <ol className="relative flex flex-col gap-0.5" aria-label="Průběh onboardingu">
            <span aria-hidden className="absolute bottom-4 left-[11px] top-4 w-0.5 bg-white/20" />
            {ONBOARDING_FLOW.map((step, index) => {
                const status = statusFor(index, activeIndex);
                return (
                    <li key={step.id} className="relative">
                        <button
                            type="button"
                            onClick={() => navigateToPath(step.path)}
                            aria-current={status === 'active' ? 'step' : undefined}
                            className="group -mx-2 flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                        >
                            <span className={cn(dotClass(status), 'h-6 w-6 text-[12px]')}>
                                {status === 'done' ? <Check /> : index + 1}
                            </span>
                            <span
                                className={cn(
                                    'text-sm transition-colors',
                                    status === 'active' && 'font-semibold text-white',
                                    status === 'done' && 'font-medium text-white/80 group-hover:text-white',
                                    status === 'upcoming' && 'text-white/55 group-hover:text-white/80',
                                )}
                            >
                                {step.label}
                            </span>
                        </button>
                    </li>
                );
            })}
        </ol>
    );
}
