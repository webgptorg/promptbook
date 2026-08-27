import { ComparisonSupportMark } from '@/components/ComparisonTable/ComparisonSupportMark';
import { ComparisonTable } from '@/components/ComparisonTable/ComparisonTable';
import { COMPARISON_SUPPORT_LEVEL_NAMES, COMPARISON_SUPPORT_LEVELS } from '@/data/comparison';

/**
 * Renders the comparison of `ptbk coder` with the coding agents it drives.
 *
 * Note: Specified in [`specs/sections/comparison.md`](../../../specs/sections/comparison.md)
 */
export function ComparisonSection() {
    return (
        <section id="comparison" className="border-y border-gray-800/80 bg-gray-900/30">
            <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
                <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
                    Not another agent. <span className="text-promptbook-blue">The layer above them.</span>
                </h2>
                <p className="mt-4 max-w-3xl text-lg text-gray-300">
                    Claude Code, OpenAI Codex and opencode are agents that ptbk coder drives, so you keep the one you
                    already use. The table is not about who writes better code. It compares what happens{' '}
                    <em>around</em> a task: whether the queue runs unattended, whether the agent definition moves to
                    another vendor, and whether git history keeps the code and its done state together.
                </p>

                <div className="mt-12">
                    <ComparisonTable />
                </div>

                <ul className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-8">
                    {COMPARISON_SUPPORT_LEVEL_NAMES.map((level) => (
                        <li key={level} className="flex items-center gap-3 text-sm text-gray-400">
                            <ComparisonSupportMark level={level} />
                            {COMPARISON_SUPPORT_LEVELS[level].legend}
                        </li>
                    ))}
                </ul>

                <p className="mt-8 max-w-3xl text-sm text-gray-500">
                    Inside a single task nothing changes. ptbk coder runs your harness as it is, with its own tools, its
                    own sandbox and its own MCP servers. The{' '}
                    <a href="#features" className="text-gray-300 transition-colors hover:text-promptbook-blue">
                        features above
                    </a>{' '}
                    explain every capability in this table in detail.
                </p>
            </div>
        </section>
    );
}
