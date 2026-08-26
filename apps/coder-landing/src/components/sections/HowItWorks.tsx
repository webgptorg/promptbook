import { CoreBenefitGraphic } from '@/components/CoreBenefitGraphic/CoreBenefitGraphic';
import { CORE_BENEFITS } from '@/data/coreBenefits';

/**
 * Renders the core benefits of `ptbk coder` for a developer who knows coding agents
 * but has never used a PRD queue.
 *
 * Note: Specified in [`specs/sections/what-is-ptbk-coder.md`](../../../specs/sections/what-is-ptbk-coder.md)
 */
export function HowItWorks() {
    return (
        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
                Ship a backlog, not a <span className="text-promptbook-blue">stream of interruptions.</span>
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-gray-300">
                <strong className="text-white">ptbk coder</strong> turns PRD markdown files into an autonomous,
                versioned development loop. Start a run, choose its harness, and come back to verified commits — not a
                queue of questions that needs your attention every few minutes.
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
                {CORE_BENEFITS.map((benefit) => (
                    <article
                        key={benefit.title}
                        className="group overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 p-5 text-center transition-colors hover:border-promptbook-blue-dark/70"
                    >
                        <CoreBenefitGraphic illustration={benefit.illustration} />
                        <p className="mt-6 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-promptbook-blue">
                            {benefit.label}
                        </p>
                        <h3 className="mt-3 font-display text-xl font-semibold text-white">{benefit.title}</h3>
                        <p className="mt-3 text-sm leading-6 text-gray-400">{benefit.description}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}
