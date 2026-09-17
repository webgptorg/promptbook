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
                Give your agent a <span className="text-promptbook-green">soul</span>, in plain text
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-gray-300">
                Every run can carry an agent written in the{' '}
                <a
                    href="https://github.com/webgptorg/book"
                    className="text-promptbook-blue underline decoration-promptbook-blue-dark underline-offset-4 hover:text-promptbook-green"
                >
                    Book language
                </a>
                , Promptbook&apos;s human-readable language for defining AI agents. Its rules, its persona and what it
                knows live in <code className="text-promptbook-blue">.book</code> files. ptbk coder resolves the selected
                book&apos;s inheritance and imports into the system message of every coding prompt.
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
                        agent at <code className="text-promptbook-blue">agents/developer.book</code> and its shared
                        ancestor at <code className="text-promptbook-blue">agents/.core/adam.book</code>. Edit these
                        files to change how your agent codes.
                    </p>
                    <p className="mt-4 text-gray-400">
                        Use <code className="text-promptbook-blue">FROM @Pavol</code> or{' '}
                        <code className="text-promptbook-blue">{'FROM {Pavol}'}</code> to inherit from another book by
                        its first-line name. Books are discovered recursively beneath the selected agent&apos;s folder.
                        <code className="text-promptbook-blue"> IMPORT</code> and{' '}
                        <code className="text-promptbook-blue">TEAM</code> use the same reference rules.
                    </p>
                    <p className="mt-4 text-gray-400">
                        Paths starting with <code className="text-promptbook-blue">./</code> or{' '}
                        <code className="text-promptbook-blue">../</code> are relative to the book declaring them;
                        other paths are relative to your current directory. HTTP and HTTPS book URLs work too.
                        Adam is inherited by default and created in the selected book&apos;s{' '}
                        <code className="text-promptbook-blue">.core</code> folder when missing. Use{' '}
                        <code className="text-promptbook-blue">FROM @null</code> or{' '}
                        <code className="text-promptbook-blue">FROM @void</code> to inherit from nothing; braces work too.
                    </p>
                    <p className="mt-4 text-gray-400">
                        Route a ready task to that agent with a status line such as{' '}
                        <code className="text-promptbook-blue">[ ] use agent `developer`</code>. Its path, filename,
                        filename without <code className="text-promptbook-blue">.book</code>, or title from the first
                        line of the Book all work.
                    </p>
                    <p className="mt-4 text-gray-400">
                        A finished task is signed by the agent, not only by the harness that carried it:{' '}
                        <code className="text-promptbook-blue">[x] by Developer on OpenAI Codex `gpt-5.6-luna`</code>.
                    </p>
                </div>

                <div>
                    <p className="mb-4 font-mono text-sm text-gray-500">readonly preview of agents/developer.book</p>
                    <DeveloperAgentBookPreview />
                </div>
            </div>
        </section>
    );
}
