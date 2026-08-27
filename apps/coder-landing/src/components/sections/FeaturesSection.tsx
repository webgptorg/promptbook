import { ADVANCED_FEATURES } from '@/data/advancedFeatures';
import { TerminalBlock } from '@/components/TerminalBlock/TerminalBlock';

/**
 * Renders the advanced features grid - each feature as a card with a terminal snippet.
 *
 * Note: Specified in [`specs/sections/advanced-features.md`](../../../specs/sections/advanced-features.md)
 */
export function FeaturesSection() {
    return (
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
                Built for <span className="text-promptbook-blue">unattended</span> coding
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-gray-300">
                The agent writes the code. ptbk coder does the rest: it runs your tests, commits, pulls and pushes,
                paces the queue against your quota window, and gives you back control the moment you press P or X. That
                is what keeps a run going for hours without you.
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {ADVANCED_FEATURES.map((feature) => (
                    <article
                        key={feature.title}
                        className="flex min-w-0 flex-col rounded-xl border border-gray-800 bg-gray-900/50 p-6 transition-colors hover:border-gray-600"
                    >
                        <h3 className="font-display text-lg font-semibold text-white">{feature.title}</h3>
                        <p className="mt-2 flex-1 text-sm text-gray-400">{feature.description}</p>
                        <div className="mt-4">
                            <TerminalBlock command={feature.sampleCommand} />
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}
