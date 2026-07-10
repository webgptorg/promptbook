import { TerminalBlock } from '@/components/TerminalBlock/TerminalBlock';
import { INIT_COMMAND, INSTALL_COMMAND, RUN_COMMAND, SERVER_COMMAND } from '@/data/commands';
import type { ReactNode } from 'react';

/**
 * One step of the quickstart walkthrough.
 */
type QuickstartStep = {
    /**
     * Short title of the step
     */
    readonly title: string;

    /**
     * Explanation of the step
     */
    readonly description: ReactNode;

    /**
     * Terminal sample of the step, or `null` for steps without a command
     */
    readonly command: string | null;

    /**
     * Title of the terminal window of the step
     */
    readonly terminalTitle?: string;
};

/**
 * The quickstart walkthrough from installation to the coder server.
 *
 * Note: Specified in [`specs/sections/quickstart.md`](../../../specs/sections/quickstart.md)
 */
const QUICKSTART_STEPS: ReadonlyArray<QuickstartStep> = [
    {
        title: 'Install Promptbook',
        description: (
            <>
                <code className="text-promptbook-blue">ptbk coder</code> ships with the{' '}
                <code className="text-promptbook-blue">ptbk</code> package. Install it in your project (or globally with{' '}
                <code className="text-promptbook-blue">-g</code>).
            </>
        ),
        command: INSTALL_COMMAND,
    },
    {
        title: 'Initialize your project',
        description: (
            <>
                Creates the <code className="text-promptbook-blue">prompts/</code> queue,{' '}
                <code className="text-promptbook-blue">prompts/done/</code> archive, the default{' '}
                <code className="text-promptbook-blue">agents/developer.book</code> persona,{' '}
                <code className="text-promptbook-blue">AGENTS.md</code> project context, and the agent git identity
                entries in <code className="text-promptbook-blue">.env</code>.
            </>
        ),
        command: INIT_COMMAND,
    },
    {
        title: 'Write your backlog as prompts',
        description: (
            <>
                Each task is one markdown file in <code className="text-promptbook-blue">prompts/</code>. Write it the
                same way you would prompt Claude Code or Codex — plain language, as specific as you like.
            </>
        ),
        command: 'echo "Add a dark mode" > prompts/add-dark-mode.md',
        terminalTitle: 'prompts/add-dark-mode.md',
    },
    {
        title: 'Run the queue',
        description: (
            <>
                Pick a harness and let it work. Every prompt is implemented, verified and committed — then the next one
                starts. Add <code className="text-promptbook-blue">--dry-run</code> first if you just want to preview
                the queue.
            </>
        ),
        command: RUN_COMMAND,
    },
    {
        title: 'Or keep it running as a server',
        description: (
            <>
                <code className="text-promptbook-blue">ptbk coder server</code> never stops: it watches{' '}
                <code className="text-promptbook-blue">prompts/</code> for new files and serves a Trello-style kanban
                board at <code className="text-promptbook-blue">localhost:4441</code> where you can watch progress and
                edit prompts from the browser.
            </>
        ),
        command: SERVER_COMMAND,
    },
];

/**
 * Renders the quickstart section - the full path from installation to the coder server.
 */
export function Quickstart() {
    return (
        <section id="quickstart" className="border-y border-gray-800/80 bg-gray-900/30">
            <div className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
                <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
                    From <span className="text-promptbook-green">install</span> to{' '}
                    <span className="text-promptbook-blue">autopilot</span> in five steps
                </h2>

                <ol className="mt-12 space-y-10">
                    {QUICKSTART_STEPS.map((step, stepIndex) => (
                        <li key={step.title} className="grid gap-6 lg:grid-cols-2 lg:items-center">
                            <div>
                                <div className="flex items-center gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-promptbook-blue font-mono text-sm font-bold text-promptbook-dark-gray">
                                        {stepIndex + 1}
                                    </span>
                                    <h3 className="font-display text-xl font-semibold text-white">{step.title}</h3>
                                </div>
                                <p className="mt-3 text-gray-400 lg:ml-11">{step.description}</p>
                            </div>
                            {step.command !== null && (
                                <TerminalBlock command={step.command} title={step.terminalTitle} />
                            )}
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
