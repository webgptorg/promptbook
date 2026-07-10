import { HARNESS_CATALOG, THINKING_LEVELS } from '@/data/harnessCatalog';
import { HarnessLogo } from '@/components/HarnessLogo/HarnessLogo';
import { TerminalBlock } from '@/components/TerminalBlock/TerminalBlock';

/**
 * Renders the harnesses section - one card per supported coding agent with logo,
 * model examples and a shell sample.
 *
 * Note: Specified in [`specs/sections/harnesses.md`](../../../specs/sections/harnesses.md)
 */
export function HarnessesSection() {
    return (
        <section id="harnesses" className="border-y border-gray-800/80 bg-gray-900/30">
            <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
                <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
                    Bring the agent <span className="text-promptbook-blue">you already use</span>
                </h2>
                <p className="mt-4 max-w-3xl text-lg text-gray-300">
                    ptbk coder does not replace your coding agent — it orchestrates it. Pick a harness with{' '}
                    <code className="text-promptbook-blue">--harness</code>, optionally a{' '}
                    <code className="text-promptbook-blue">--model</code>, and for supported harnesses a{' '}
                    <code className="text-promptbook-blue">--thinking-level</code> (
                    {THINKING_LEVELS.join(', ')}).
                </p>

                <div className="mt-12 grid gap-6 md:grid-cols-2">
                    {HARNESS_CATALOG.map((harness) => (
                        <article
                            key={harness.harnessName}
                            className="flex flex-col rounded-xl border border-gray-800 bg-gray-900/60 p-6 transition-colors hover:border-gray-600"
                        >
                            <div className="flex items-center gap-4">
                                <HarnessLogo harnessName={harness.harnessName} accentColor={harness.accentColor} />
                                <div>
                                    <h3 className="font-display text-xl font-semibold text-white">
                                        {harness.displayName}
                                    </h3>
                                    <p className="text-sm text-gray-500">by {harness.vendorName}</p>
                                </div>
                                <code className="ml-auto hidden rounded-md bg-gray-800 px-2 py-1 text-xs text-promptbook-blue sm:block">
                                    --harness {harness.harnessName}
                                </code>
                            </div>

                            <p className="mt-4 flex-1 text-gray-400">{harness.description}</p>

                            <p className="mt-4 text-sm text-gray-500">
                                {harness.modelExamples.length > 0 ? (
                                    <>
                                        Models{harness.isModelRequired ? ' (required)' : ''}:{' '}
                                        {harness.modelExamples.map((modelExample, modelExampleIndex) => (
                                            <span key={modelExample}>
                                                {modelExampleIndex > 0 && ', '}
                                                <code className="text-gray-300">{modelExample}</code>
                                            </span>
                                        ))}
                                    </>
                                ) : (
                                    <>Uses the models configured in the harness itself.</>
                                )}
                            </p>

                            <div className="mt-4">
                                <TerminalBlock command={harness.sampleCommand} />
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
