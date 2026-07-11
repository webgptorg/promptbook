import { AGENT_RUN_COMMAND } from '@/data/commands';
import { DeveloperAgentBookPreview } from '@/components/DeveloperAgentBookPreview/DeveloperAgentBookPreview';
import { TerminalBlock } from '@/components/TerminalBlock/TerminalBlock';

/**
 * Renders the agents section - the `--agent agents/developer.book` option together with
 * a readonly `<BookEditor/>` showing the default developer agent.
 *
 * Note: Specified in [`specs/sections/agent-book.md`](../../../specs/sections/agent-book.md)
 */
export function AgentsSection() {
    return (
        <section id="agents" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
                Give your agent a <span className="text-promptbook-green">soul</span> — in plain text
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-gray-300">
                Every run can carry a persona written in the{' '}
                <a
                    href="https://github.com/webgptorg/book"
                    className="text-promptbook-blue underline decoration-promptbook-blue-dark underline-offset-4 hover:text-promptbook-green"
                >
                    Book language
                </a>
                — Promptbook&apos;s human-readable language for defining AI agents. Rules, persona and knowledge live
                in a <code className="text-promptbook-blue">.book</code> file that is compiled into the system message
                of every coding prompt.
            </p>

            <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start">
                <div>
                    <p className="mb-4 text-gray-400">
                        Point <strong className="text-white">ptbk coder</strong> at any agent file with{' '}
                        <code className="text-promptbook-blue">--agent</code>:
                    </p>
                    <TerminalBlock command={AGENT_RUN_COMMAND} />
                    <p className="mt-6 text-gray-400">
                        <code className="text-promptbook-blue">ptbk coder init</code> creates this default developer
                        agent at <code className="text-promptbook-blue">agents/developer.book</code> — edit it like any
                        other file in your repository to change how your agent codes.
                    </p>
                </div>

                <div>
                    <p className="mb-4 font-mono text-sm text-gray-500">agents/developer.book — readonly preview</p>
                    <DeveloperAgentBookPreview />
                </div>
            </div>
        </section>
    );
}
