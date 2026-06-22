import type { CSSProperties, ReactNode } from 'react';

import { ONBOARDING_FLOW, getFlowIndexByPath } from '../config/steps';
import { useManGoOnboardingNavigation } from '../ManGoOnboardingNavigation';
import { useOnboarding } from '../state/OnboardingProvider';
import { Logo } from './Logo';
import { RailStepper } from './RailStepper';
import { RailArtwork } from './brand/RailArtwork';

const RAIL_GRADIENT: CSSProperties = {
    backgroundImage: 'var(--ob-grad-ink)',
};

/**
 * Split-screen wizard chrome: a persistent accent rail (brand identity, agent name,
 * vertical stepper, progress) beside the active step. The rail collapses to a compact
 * top bar on small screens.
 */
export function WizardShell({ children }: { readonly children: ReactNode }) {
    const { currentPath, requestClose } = useManGoOnboardingNavigation();
    const { state } = useOnboarding();

    const activeIndex = getFlowIndexByPath(currentPath);
    const total = ONBOARDING_FLOW.length;
    const progress = Math.round(((activeIndex + 1) / total) * 100);
    const agentName = state.agentName.trim() || 'Váš nový agent';

    return (
        <div data-onboarding-ui className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 lg:flex-row">
            {/* Mobile: compact top bar */}
            <div className="relative overflow-hidden text-white lg:hidden" style={RAIL_GRADIENT}>
                <div className="relative z-10 flex items-center justify-between px-5 py-3.5">
                    <button
                        type="button"
                        onClick={requestClose}
                        className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    >
                        <Logo className="text-white" />
                    </button>
                    <span className="max-w-[40%] truncate text-[13px] text-white/80">{agentName}</span>
                    <button
                        type="button"
                        onClick={requestClose}
                        aria-label="Zavřít průvodce"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-xl leading-none text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    >
                        ×
                    </button>
                </div>
                <div className="relative z-10 overflow-x-auto px-5 pb-3.5">
                    <RailStepper activeIndex={activeIndex} orientation="horizontal" />
                </div>
            </div>

            {/* Desktop: persistent side rail */}
            <aside
                className="relative hidden w-80 flex-shrink-0 overflow-hidden p-7 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col"
                style={RAIL_GRADIENT}
            >
                <RailArtwork />
                <div className="relative z-10 flex h-full flex-col">
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={requestClose}
                            className="inline-flex w-fit rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                        >
                            <Logo className="text-white" />
                        </button>
                        <button
                            type="button"
                            onClick={requestClose}
                            aria-label="Zavřít průvodce"
                            className="flex h-9 w-9 items-center justify-center rounded-lg text-2xl leading-none text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                        >
                            ×
                        </button>
                    </div>

                    <div className="mt-10">
                        <div className="text-xs font-medium text-white/60">Tvorba agenta</div>
                        <div className="ob-display mt-1 text-[19px] font-semibold leading-snug">{agentName}</div>
                    </div>

                    <div className="mt-9 flex-1">
                        <RailStepper activeIndex={activeIndex} orientation="vertical" />
                    </div>

                    <div className="relative z-10 mt-6">
                        <div className="mb-1.5 flex justify-between text-xs text-white/75">
                            <span>Průběh</span>
                            <span>
                                {activeIndex + 1} z {total}
                            </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                            <div
                                className="h-full rounded-full bg-[color:var(--ob-brand-blue)] transition-[width] duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="ob-display mt-5 text-[12px] leading-relaxed text-white/45">
                            Vytvořte AI, která skutečně rozumí vaší firmě.
                        </p>
                    </div>
                </div>
            </aside>

            <main className="flex-1 px-5 py-8 sm:px-8 sm:py-12">
                <div className="ob-animate-rise">{children}</div>
            </main>
        </div>
    );
}
