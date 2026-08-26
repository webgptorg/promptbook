/**
 * One step of the "How it works" explanation.
 */
type HowItWorksStep = {
    /**
     * Short title of the step
     */
    readonly title: string;

    /**
     * Description of the step
     */
    readonly description: string;
};

/**
 * The three conceptual steps of the `ptbk coder` workflow.
 */
const HOW_IT_WORKS_STEPS: ReadonlyArray<HowItWorksStep> = [
    {
        title: 'You write PRDs, not sessions',
        description:
            'Instead of chatting with an agent one task at a time, you drop each task as a markdown PRD into the prompts/ folder — a backlog your whole team can read, review and version in git.',
    },
    {
        title: 'Start once, then stop babysitting',
        description:
            'By default, it sends the next ready PRD to the coding agent you already use — Claude Code, OpenAI Codex, GitHub Copilot, Gemini CLI, opencode or Cline — as soon as the last one finishes. You do not need to approve every task or answer a new chat session every few minutes.',
    },
    {
        title: 'A done PRD means a done commit',
        description:
            'It runs your configured tests and quality checks, feeds failures back for retries, then commits the PRD status together with its code under a dedicated agent identity. Revert the commit, and both the implementation and its done mark go back together. Finished PRDs are archived to prompts/done/.',
    },
];

/**
 * Renders the "How it works" section explaining ptbk coder to someone who knows
 * Claude Code or OpenAI Codex but has never seen a prompt queue.
 *
 * Note: Specified in [`specs/sections/what-is-ptbk-coder.md`](../../../specs/sections/what-is-ptbk-coder.md)
 */
export function HowItWorks() {
    return (
        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
            <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
                Like Claude Code or Codex — <span className="text-promptbook-blue">but for your whole backlog</span>
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-gray-300">
                Coding agents are great at one task at a time. <strong className="text-white">ptbk coder</strong> sits
                one level above them: it is an orchestrator that keeps your favorite agent working through an entire
                queue of PRDs, unattended.
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
                {HOW_IT_WORKS_STEPS.map((step, stepIndex) => (
                    <div key={step.title} className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-promptbook-blue-dark/20 font-mono text-lg font-bold text-promptbook-blue">
                            {stepIndex + 1}
                        </div>
                        <h3 className="font-display text-xl font-semibold text-white">{step.title}</h3>
                        <p className="mt-2 text-gray-400">{step.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
