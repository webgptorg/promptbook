import { TerminalBlock } from '@/components/TerminalBlock/TerminalBlock';
import {
    ADD_COMMAND,
    INIT_COMMAND,
    INSTALL_COMMAND,
    LIST_COMMAND,
    PLAN_COMMAND,
    RUN_COMMAND,
    SERVER_COMMAND,
} from '@/data/commands';
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
                <code className="text-promptbook-blue">agents/developer.book</code> and{' '}
                <code className="text-promptbook-blue">agents/planner.book</code> roles, their Lawyer and Copywriter
                teammates, and shared Adam instructions, <code className="text-promptbook-blue">AGENTS.md</code> project
                context, and the agent git identity entries in <code className="text-promptbook-blue">.env</code>. It
                also adds local files created by every supported harness to{' '}
                <code className="text-promptbook-blue">.gitignore</code>. Nothing you already own is ever overwritten:
                existing <code className="text-promptbook-blue">package.json</code> scripts and{' '}
                <code className="text-promptbook-blue">.vscode/settings.json</code> settings are kept as they are, and
                missing role Books are restored even when scripts already exist. Init adds missing helper TEAM
                references to Developer and Planner while preserving your rules and existing teammates. The new{' '}
                <code className="text-promptbook-blue">coder:run</code> script uses the current Codex flagship without
                pinning a model version. Both role scripts use their default Books without redundant{' '}
                <code className="text-promptbook-blue">--agent</code> arguments. Run init again any time.
            </>
        ),
        command: INIT_COMMAND,
    },
    {
        title: 'Discuss features with Planner',
        description: (
            <>
                Planner reads your repository, asks about unresolved requirements, and helps split features into PRDs.
                Discuss several topics and revise earlier decisions in one terminal conversation. Review proposed paths
                and changes, then use <code className="text-promptbook-blue">/save</code> for pending tasks or{' '}
                <code className="text-promptbook-blue">/draft</code> for unresolved{' '}
                <code className="text-promptbook-blue">[-]</code> drafts. Only PRD Markdown files can change.
                <code className="text-promptbook-blue"> /exit</code> ends without starting implementation. Customize{' '}
                <code className="text-promptbook-blue">agents/planner.book</code> or select another Book with{' '}
                <code className="text-promptbook-blue">--agent agents/my-planner.book</code>.
            </>
        ),
        command: PLAN_COMMAND,
    },
    {
        title: 'Or add a task from a description',
        description: (
            <>
                Use the lightweight description-to-prompt command, or put a task directly in{' '}
                <code className="text-promptbook-blue">prompts/</code>.{' '}
                <code className="text-promptbook-blue">ptbk coder add</code> creates one for you. A status checkbox is
                optional: a prompt without one is ready at priority 0 and receives its live status when processing
                begins. Describe the task the same way you would prompt Claude Code or Codex, in plain language and as
                specific as you like. Pipe in a heredoc for longer descriptions, or run it with no arguments and type
                one interactively.
            </>
        ),
        command: ADD_COMMAND,
    },
    {
        title: 'Run the queue',
        description: (
            <>
                Pick a harness and it selects the current flagship model automatically. The local Developer Book at{' '}
                <code className="text-promptbook-blue">agents/developer.book</code> supplies the instructions;{' '}
                <code className="text-promptbook-blue">--agent</code> selects another Book. It implements one prompt,
                verifies it, commits it, then starts the next one. Run{' '}
                <code className="text-promptbook-blue">{LIST_COMMAND}</code> first if you only want to see the ready
                queue for all agents grouped by priority.
            </>
        ),
        command: RUN_COMMAND,
    },
    {
        title: 'Or keep it running as a server',
        description: (
            <>
                <code className="text-promptbook-blue">ptbk coder server</code> never stops. It watches{' '}
                <code className="text-promptbook-blue">prompts/</code> for new files and serves a Trello-style kanban
                board at <code className="text-promptbook-blue">localhost:4441</code>, where you can follow progress and
                edit prompts in the browser.
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
                    <span className="text-promptbook-blue">autopilot</span> in six steps
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
