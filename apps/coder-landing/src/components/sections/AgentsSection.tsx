import { AGENT_RUN_COMMAND } from '@/data/commands';
import { DeveloperAgentBookPreview } from '@/components/DeveloperAgentBookPreview/DeveloperAgentBookPreview';
import { TerminalBlock } from '@/components/TerminalBlock/TerminalBlock';

/**
 * Renders the default Book roles and optional `--agent` override together with
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
                Coding and planning use agents written in the{' '}
                <a
                    href="https://github.com/webgptorg/book"
                    className="text-promptbook-blue underline decoration-promptbook-blue-dark underline-offset-4 hover:text-promptbook-green"
                >
                    Book language
                </a>
                , Promptbook&apos;s human-readable language for defining AI agents. Each agent&apos;s persona, rules and
                knowledge live in <code className="text-promptbook-blue">.book</code> files. ptbk coder resolves the
                selected book&apos;s inheritance and imports into the system message of every coding prompt.
            </p>

            <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start">
                <div>
                    <p className="mb-4 text-gray-400">
                        Override the default role with your own Book using{' '}
                        <code className="text-promptbook-blue">--agent</code>:
                    </p>
                    <TerminalBlock command={AGENT_RUN_COMMAND} />
                    <p className="mt-6 text-gray-400">
                        <code className="text-promptbook-blue">ptbk coder init</code> creates this default developer
                        agent at <code className="text-promptbook-blue">agents/developer.book</code> and its shared
                        ancestor at <code className="text-promptbook-blue">agents/.core/adam.book</code>, alongside{' '}
                        <code className="text-promptbook-blue">agents/planner.book</code>. Developer implements changes;
                        Planner discusses requirements and authors PRDs. Both inherit Adam directly through the same
                        default inheritance. Edit the local role Books to customize their behavior.
                    </p>
                    <p className="mt-4 text-gray-400">
                        Both roles include Lawyer and Copywriter in their TEAM. Lawyer helps identify legal and
                        compliance questions; Copywriter helps with labels, errors, onboarding, and other application
                        text. Their editable Books live at{' '}
                        <code className="text-promptbook-blue">agents/lawyer.book</code> and{' '}
                        <code className="text-promptbook-blue">agents/copywriter.book</code>, sharing Adam&apos;s core
                        instructions. During coding or planning, the primary agent can ask a relevant adviser a question
                        and use its answer in the same task. Each adviser runs its own Book; unused advisers make no
                        model calls. Local consultations work without an Agents Server.
                    </p>
                    <p className="mt-4 text-gray-400">
                        TEAM works with custom Books and inherited declarations across all seven coding harnesses.
                        Planning currently uses OpenAI Codex, and every adviser follows the same planning restrictions:
                        only the primary agent proposes PRDs for your review. Consultation results, failures and
                        available usage appear in the task&apos;s existing trace.
                    </p>
                    <p className="mt-4 text-gray-400">
                        <code className="text-promptbook-blue">run</code>,{' '}
                        <code className="text-promptbook-blue">server</code> and{' '}
                        <code className="text-promptbook-blue">plan</code> select Developer automatically. Select Planner
                        with <code className="text-promptbook-blue">--agent ./agents/planner.book</code>. Local Book edits apply on
                        the next invocation. <code className="text-promptbook-blue">--agent</code> changes the persona,
                        instructions and identity; <code className="text-promptbook-blue">--harness</code> selects the
                        coding tool and <code className="text-promptbook-blue">--model</code> selects its model.
                        Planning permits only PRD changes with any selected Book.
                    </p>
                    <p className="mt-4 text-gray-400">
                        The project defaults to your current directory. Use{' '}
                        <code className="text-promptbook-blue">--path</code> to select another project. Its{' '}
                        <code className="text-promptbook-blue">AGENTS.md</code> is loaded as additional context;
                        a missing file produces a diagnostic and continues.{' '}
                        <code className="text-promptbook-blue">--context</code> replaces it with inline instructions or
                        a file relative to the selected project. An empty value disables this context. Books and PRDs
                        stay in the selected project even when Git belongs to a parent directory.
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
                        <code className="text-promptbook-blue">../</code> are relative to the book declaring them; other
                        paths are relative to the selected project. HTTP and HTTPS book URLs work too. Adam is
                        inherited by default. Planning requires the Books to be prepared with{' '}
                        <code className="text-promptbook-blue">ptbk coder init</code> and never creates them during a
                        conversation. Use <code className="text-promptbook-blue">FROM @null</code> or{' '}
                        <code className="text-promptbook-blue">FROM @void</code> to inherit from nothing; braces work
                        too.
                    </p>
                    <p className="mt-4 text-gray-400">
                        Route a ready task to that agent with a status line such as{' '}
                        <code className="text-promptbook-blue">[ ] use agent `developer`</code>. Its path, filename,
                        filename without <code className="text-promptbook-blue">.book</code>, or title from the first
                        line of the Book all work.
                    </p>
                    <p className="mt-4 text-gray-400">
                        <code className="text-promptbook-blue">coder list</code> shows tasks for all agents unless you
                        supply <code className="text-promptbook-blue">--agent</code>. If a default Book is missing, run{' '}
                        <code className="text-promptbook-blue">ptbk coder init</code>. An invalid explicit Book
                        selection reports an error. Repeated initialization creates missing Books and adds missing
                        helper TEAM references, preserving your personas, rules, teammates, and scripts. Conflicting or
                        unreadable Books are reported for you to resolve.
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
