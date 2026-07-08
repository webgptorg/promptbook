import {
    ArrowRight,
    BadgeCheck,
    BrainCircuit,
    CheckCircle2,
    ClipboardList,
    Code2,
    GitBranch,
    GitCommit,
    LayoutDashboard,
    ListChecks,
    PauseCircle,
    Play,
    ShieldCheck,
    Sparkles,
    Terminal,
    type LucideIcon,
} from 'lucide-react';

/**
 * Navigation anchor used by the landing page header.
 */
type NavigationItem = {
    readonly href: string;
    readonly label: string;
};

/**
 * Hero metric shown below the primary introduction.
 */
type HeroMetric = {
    readonly value: string;
    readonly label: string;
};

/**
 * Terminal walkthrough step shown as a code-focused onboarding sequence.
 */
type WalkthroughStep = {
    readonly label: string;
    readonly title: string;
    readonly description: string;
    readonly code: string;
};

/**
 * Workflow card describing one part of the prompt lifecycle.
 */
type WorkflowItem = {
    readonly icon: LucideIcon;
    readonly title: string;
    readonly description: string;
};

/**
 * Product feature shown in the feature grid.
 */
type FeatureItem = {
    readonly icon: LucideIcon;
    readonly title: string;
    readonly description: string;
};

/**
 * Supported harness card shown in the harness grid.
 */
type HarnessItem = {
    readonly title: string;
    readonly description: string;
    readonly command: string;
};

/**
 * FAQ item shown at the bottom of the landing page.
 */
type FrequentlyAskedQuestion = {
    readonly question: string;
    readonly answer: string;
};

/**
 * Header navigation for the single-page landing page.
 */
const NAVIGATION_ITEMS: ReadonlyArray<NavigationItem> = [
    { href: '#walkthrough', label: 'Commands' },
    { href: '#workflow', label: 'Workflow' },
    { href: '#server', label: 'Server' },
    { href: '#harnesses', label: 'Harnesses' },
];

/**
 * Product metrics derived from current ptbk coder behavior.
 */
const HERO_METRICS: ReadonlyArray<HeroMetric> = [
    { value: '6', label: 'agent harnesses' },
    { value: '3x', label: 'test-feedback attempts' },
    { value: '1', label: 'prompt queue in Git' },
];

/**
 * Terminal-first onboarding sequence for ptbk coder.
 */
const WALKTHROUGH_STEPS: ReadonlyArray<WalkthroughStep> = [
    {
        label: '01 install',
        title: 'Install the Promptbook CLI',
        description: 'Add ptbk to the project or run it through npx. The coder commands live under the same CLI.',
        code: 'npm install ptbk\nnpx ptbk coder --help',
    },
    {
        label: '02 initialize',
        title: 'Create the prompt workspace',
        description:
            'Initialization creates prompt folders, reusable templates, a developer agent book, AGENTS wiring, package scripts, and VS Code image paste settings.',
        code: 'ptbk coder init\n\n# Created or updated:\n# prompts/\n# prompts/done/\n# prompts/templates/common.md\n# agents/developer.book\n# AGENTS.md\n# .vscode/settings.json',
    },
    {
        label: '03 write tasks',
        title: 'Write work as prompt sections',
        description:
            'Each markdown section becomes a queued unit of work. Use [-] for draft tasks, [ ] for runnable tasks, and extra ! markers for priority.',
        code: 'ptbk coder generate-boilerplates --template ./prompts/templates/common.md\n\n# prompts/2026-07-08-0010-api-cleanup.md\n[ ] !!\nRefactor the token refresh flow.\n\n- Keep backwards compatibility.\n- Add tests.\n---\n[-]\nDocument the new retry behavior.',
    },
    {
        label: '04 run locally',
        title: 'Run the queue through an agent',
        description:
            'ptbk coder builds the prompt, prepends your agent behavior, appends project context, checks the working tree, runs the harness, verifies changes, and records the result.',
        code: 'ptbk coder run \\\n  --harness openai-codex \\\n  --model gpt-5.5 \\\n  --thinking-level xhigh \\\n  --agent agents/developer.book \\\n  --context AGENTS.md \\\n  --test "npm test"',
    },
    {
        label: '05 operate',
        title: 'Keep a browser board open',
        description:
            'Server mode keeps watching for new prompt files, exposes a local kanban board, and lets the browser pause or edit prompt sections while the runner stays alive.',
        code: 'ptbk coder server \\\n  --harness claude-code \\\n  --model fable \\\n  --thinking-level max \\\n  --agent agents/coding/developer.book \\\n  --context AGENTS.md \\\n  --test npm run test-for-ptbk-coder',
    },
    {
        label: '06 scale',
        title: 'Automate routine engineering',
        description:
            'Use priority filters, pacing, automatic pulls, pushes, database migrations, and refactor-candidate prompts when the queue becomes a continuous workflow.',
        code: 'ptbk coder find-refactor-candidates --level medium --limit 10\nptbk coder run --priority 1 --auto-pull --auto-push --auto-migrate\nptbk coder verify --ignore experimental',
    },
];

/**
 * Prompt lifecycle cards for the workflow section.
 */
const WORKFLOW_ITEMS: ReadonlyArray<WorkflowItem> = [
    {
        icon: ClipboardList,
        title: 'Prompt backlog',
        description: 'Store coding work in markdown files that can be reviewed, reordered, prioritized, and committed.',
    },
    {
        icon: BrainCircuit,
        title: 'Agent behavior',
        description: 'Load a .book agent and project context so every task runs with the same engineering rules.',
    },
    {
        icon: ListChecks,
        title: 'Verification loop',
        description:
            'Run a test command after each attempt and feed failing output back to the agent up to three times.',
    },
    {
        icon: GitCommit,
        title: 'Git bookkeeping',
        description:
            'Mark prompts done or failed, normalize changed line endings, commit successful work, and optionally push.',
    },
];

/**
 * Feature grid content grounded in the current CLI implementation.
 */
const FEATURE_ITEMS: ReadonlyArray<FeatureItem> = [
    {
        icon: Terminal,
        title: 'Terminal-native agent runs',
        description:
            'Use rich TTY progress when interactive, or switch to plain streaming output with --no-ui for logs.',
    },
    {
        icon: LayoutDashboard,
        title: 'Local kanban server',
        description:
            'Open a browser board at localhost, watch progress, edit prompt sections, and pause or resume the runner.',
    },
    {
        icon: GitBranch,
        title: 'Clean repository discipline',
        description:
            'Require a clean working tree before each task, pull between rounds, and keep generated commits scoped.',
    },
    {
        icon: ShieldCheck,
        title: 'Failure visibility',
        description:
            'Failed tasks are marked in the prompt file and get an error log so the next repair prompt has context.',
    },
    {
        icon: Sparkles,
        title: 'Fresh prompt boilerplates',
        description: 'Generate numbered prompt files with reusable templates and repository-wide fresh emoji tags.',
    },
    {
        icon: Code2,
        title: 'Refactor discovery',
        description:
            'Scan the codebase for oversized or complex files and generate prompt candidates for the highest-impact work.',
    },
];

/**
 * Harnesses currently exposed by ptbk coder runner selection.
 */
const HARNESS_ITEMS: ReadonlyArray<HarnessItem> = [
    {
        title: 'OpenAI Codex',
        description: 'Use Codex models with explicit model and optional credit spending controls.',
        command: '--harness openai-codex --model gpt-5.5',
    },
    {
        title: 'Claude Code',
        description: 'Run the same prompt queue through Claude Code when that is the developer workspace of choice.',
        command: '--harness claude-code --model fable',
    },
    {
        title: 'GitHub Copilot',
        description: 'Drive the Copilot CLI with configurable thinking level and the same prompt lifecycle.',
        command: '--harness github-copilot --thinking-level xhigh',
    },
    {
        title: 'Cline',
        description: 'Use Cline as the implementation harness while ptbk coder owns queueing and verification.',
        command: '--harness cline',
    },
    {
        title: 'Opencode',
        description: 'Connect Opencode to prompt files and keep the existing ptbk coder bookkeeping around it.',
        command: '--harness opencode',
    },
    {
        title: 'Gemini',
        description: 'Run Gemini CLI models with the same context, test feedback, and prompt status updates.',
        command: '--harness gemini --model gemini-3-flash-preview',
    },
];

/**
 * FAQ content for developers comparing ptbk coder with familiar agent tools.
 */
const FREQUENTLY_ASKED_QUESTIONS: ReadonlyArray<FrequentlyAskedQuestion> = [
    {
        question: 'Is ptbk coder another AI model?',
        answer: 'No. It is a Promptbook CLI workflow that runs external coding harnesses such as OpenAI Codex, Claude Code, GitHub Copilot, Cline, Opencode, or Gemini.',
    },
    {
        question: 'Why use prompt files instead of one-off chat?',
        answer: 'Prompt files make coding work durable. You can review task wording, set priority, split work into sections, archive verified prompts, and keep the backlog in Git.',
    },
    {
        question: 'What happens when tests fail?',
        answer: 'The verification output is appended back into the next attempt. After the configured attempts are exhausted, the prompt is marked failed and an error log is written.',
    },
    {
        question: 'Does the server send code to a hosted ptbk service?',
        answer: 'The server is a local HTTP UI over the prompt folder and runner state. The selected harness still decides which AI provider receives prompt context.',
    },
];

/**
 * Landing page for ptbk coder.
 *
 * @private internal page of the coder landing app
 */
export default function HomePage() {
    return (
        <main className="page-shell">
            <SiteHeader />
            <HeroSection />
            <WalkthroughSection />
            <WorkflowSection />
            <FeaturesSection />
            <ServerSection />
            <HarnessSection />
            <FrequentlyAskedQuestionsSection />
            <SiteFooter />
        </main>
    );
}

/**
 * Sticky top navigation for the page.
 */
function SiteHeader() {
    return (
        <header className="site-header">
            <div className="site-header__inner">
                <a className="brand-lockup" href="#top" aria-label="ptbk coder home">
                    <span className="brand-mark">ptbk</span>
                    <span>ptbk coder</span>
                </a>
                <nav className="site-nav" aria-label="Page sections">
                    {NAVIGATION_ITEMS.map((item) => (
                        <a key={item.href} href={item.href}>
                            {item.label}
                        </a>
                    ))}
                </nav>
            </div>
        </header>
    );
}

/**
 * First viewport section with the primary product explanation and mock terminal.
 */
function HeroSection() {
    return (
        <section id="top" className="shell-section hero">
            <div>
                <div className="eyebrow">
                    <Terminal size={16} aria-hidden="true" />
                    CLI workflow for AI coding agents
                </div>
                <h1>ptbk coder</h1>
                <p className="hero__tagline">Prompt queues into shipped commits.</p>
                <p className="hero__lead">
                    If Claude Code or Codex is the agent, ptbk coder is the operating loop around it: project-owned
                    prompt files, consistent agent behavior, verification feedback, local progress UI, and Git
                    bookkeeping after each task.
                </p>
                <div className="hero__actions">
                    <a className="action-link action-link--primary" href="#walkthrough">
                        Start with commands <ArrowRight size={17} aria-hidden="true" />
                    </a>
                    <a className="action-link" href="#workflow">
                        See the workflow
                    </a>
                </div>
                <div className="hero__metrics" aria-label="ptbk coder capabilities">
                    {HERO_METRICS.map((metric) => (
                        <div className="metric" key={metric.label}>
                            <strong>{metric.value}</strong>
                            <span>{metric.label}</span>
                        </div>
                    ))}
                </div>
            </div>
            <ProductMockup />
        </section>
    );
}

/**
 * Main product visual showing terminal execution and server board state.
 */
function ProductMockup() {
    return (
        <div className="product-frame" aria-label="ptbk coder terminal and kanban preview">
            <div className="product-frame__bar">
                <div className="window-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </div>
                <div className="product-frame__title">~/repo - ptbk coder server</div>
            </div>
            <div className="terminal-grid">
                <div className="terminal-pane">
                    <p className="terminal-line">
                        <span className="prompt">$</span> ptbk coder server --harness claude-code --model fable
                    </p>
                    <p className="terminal-line">
                        <span className="comment">Loading prompts from ./prompts</span>
                        {'\n'}
                        <span className="accent">Running prompts with Claude Code</span>
                        {'\n'}
                        Server: http://localhost:4441
                    </p>
                    <p className="terminal-line">
                        <span className="warning">Current prompt</span>
                        {'\n'}
                        prompts/2026-07-08-0010-api-cleanup.md#1
                        {'\n\n'}
                        Build retry-safe token refresh and update tests.
                    </p>
                    <p className="terminal-line">
                        <span className="comment">Attempt 1: agent edited 4 files</span>
                        {'\n'}
                        <span className="comment">Verification: npm test failed</span>
                        {'\n'}
                        <span className="accent">Attempt 2: sent test output back to agent</span>
                        {'\n'}
                        <span className="prompt">Done:</span> committed &quot;Refactor token refresh flow&quot;
                    </p>
                </div>
                <ServerBoardPreview />
            </div>
        </div>
    );
}

/**
 * Compact kanban preview used in the hero and server sections.
 */
function ServerBoardPreview() {
    return (
        <div className="server-preview">
            <div className="server-preview__header">
                <span>Prompt board</span>
                <span className="status-pill">
                    <Play size={12} aria-hidden="true" />
                    running
                </span>
            </div>
            <div className="kanban-board" aria-label="Prompt lifecycle columns">
                <div className="kanban-column">
                    <h3>
                        Ready <span>3</span>
                    </h3>
                    <div className="kanban-card">
                        <strong>Repair flaky checkout test</strong>
                        <span>[ ] !! prompts/checkout.md#2</span>
                    </div>
                    <div className="kanban-card">
                        <strong>Extract auth provider</strong>
                        <span>[ ] ! prompts/auth.md#1</span>
                    </div>
                </div>
                <div className="kanban-column">
                    <h3>
                        Running <span>1</span>
                    </h3>
                    <div className="kanban-card">
                        <strong>Token refresh retry flow</strong>
                        <span>attempt 2 - verifying</span>
                    </div>
                </div>
                <div className="kanban-column">
                    <h3>
                        Draft <span>2</span>
                    </h3>
                    <div className="kanban-card">
                        <strong>Document migration guard</strong>
                        <span>[-] prompts/db.md#3</span>
                    </div>
                </div>
                <div className="kanban-column">
                    <h3>
                        Done <span>8</span>
                    </h3>
                    <div className="kanban-card">
                        <strong>Normalize line endings</strong>
                        <span>[x] openai-codex gpt-5.5</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Terminal command sequence from install to advanced operation.
 */
function WalkthroughSection() {
    return (
        <section id="walkthrough" className="shell-section section-block">
            <SectionHeading
                eyebrow="Terminal walkthrough"
                title="From install to a running agent queue."
                description="The landing page shows the actual operating shape: install, initialize, write markdown tasks, run them, keep the server open, and scale the loop."
            />
            <div className="walkthrough">
                {WALKTHROUGH_STEPS.map((step) => (
                    <article className="walkthrough-step" key={step.label}>
                        <div className="walkthrough-step__copy">
                            <span className="walkthrough-step__label">{step.label}</span>
                            <h3>{step.title}</h3>
                            <p>{step.description}</p>
                        </div>
                        <div className="code-window">
                            <pre>{step.code}</pre>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

/**
 * Prompt lifecycle section.
 */
function WorkflowSection() {
    return (
        <section id="workflow" className="shell-section section-block">
            <SectionHeading
                eyebrow="How it works"
                title="A coding-agent loop you can inspect."
                description="ptbk coder keeps the important state in files and Git, while the selected harness focuses on implementation."
            />
            <div className="workflow-grid">
                {WORKFLOW_ITEMS.map((item) => (
                    <article className="workflow-card" key={item.title}>
                        <div className="workflow-card__icon">
                            <item.icon size={20} aria-hidden="true" />
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}

/**
 * Feature grid section.
 */
function FeaturesSection() {
    return (
        <section className="shell-section section-block">
            <SectionHeading
                eyebrow="Features"
                title="Built for developers who already live in terminals."
                description="The feature set is intentionally practical: repeatable prompts, runner selection, verification feedback, browser visibility, and clean repository state."
            />
            <div className="feature-grid">
                {FEATURE_ITEMS.map((item) => (
                    <article className="feature-card" key={item.title}>
                        <item.icon size={22} aria-hidden="true" />
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}

/**
 * Server-mode section with the local board preview.
 */
function ServerSection() {
    return (
        <section id="server" className="shell-section section-block">
            <SectionHeading
                eyebrow="Server mode"
                title="Keep the queue visible while agents work."
                description="The server command runs the same prompt processor in keep-alive mode and exposes a local kanban UI for day-to-day operation."
            />
            <div className="server-panel">
                <div className="product-frame server-panel__mock">
                    <div className="product-frame__bar">
                        <div className="window-dots" aria-hidden="true">
                            <span />
                            <span />
                            <span />
                        </div>
                        <div className="product-frame__title">http://localhost:4441</div>
                    </div>
                    <ServerBoardPreview />
                </div>
                <div className="server-panel__copy">
                    <h3>Operate it like a local control room.</h3>
                    <p>
                        The browser is not a separate product surface. It is a live view over prompt files, pause state,
                        and runner progress so a developer can keep long-running work understandable.
                    </p>
                    <ul className="server-panel__list">
                        <li>
                            <PauseCircle size={18} aria-hidden="true" />
                            Pause or resume from browser or terminal before key checkpoints.
                        </li>
                        <li>
                            <CheckCircle2 size={18} aria-hidden="true" />
                            Edit prompt sections from the board and commit those prompt edits.
                        </li>
                        <li>
                            <BadgeCheck size={18} aria-hidden="true" />
                            Keep watching for new runnable prompts instead of exiting when the queue empties.
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
}

/**
 * Supported harnesses section.
 */
function HarnessSection() {
    return (
        <section id="harnesses" className="shell-section section-block">
            <SectionHeading
                eyebrow="Harnesses"
                title="Bring the coding agent you already trust."
                description="ptbk coder normalizes the project workflow around multiple runner integrations instead of forcing one model or editor."
            />
            <div className="harness-grid">
                {HARNESS_ITEMS.map((item) => (
                    <article className="harness-card" key={item.title}>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                        <code className="harness-card__command">{item.command}</code>
                    </article>
                ))}
            </div>
        </section>
    );
}

/**
 * FAQ section.
 */
function FrequentlyAskedQuestionsSection() {
    return (
        <section className="shell-section section-block">
            <SectionHeading
                eyebrow="FAQ"
                title="Plain answers for developers."
                description="The goal is to make the first run understandable before someone reads the CLI source."
            />
            <div className="faq-grid">
                {FREQUENTLY_ASKED_QUESTIONS.map((item) => (
                    <article className="faq-item" key={item.question}>
                        <h3>{item.question}</h3>
                        <p>{item.answer}</p>
                    </article>
                ))}
            </div>
        </section>
    );
}

/**
 * Reusable heading for each page section.
 */
function SectionHeading({
    eyebrow,
    title,
    description,
}: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
}>) {
    return (
        <div className="section-heading">
            <div>
                <div className="eyebrow">{eyebrow}</div>
                <h2>{title}</h2>
            </div>
            <p>{description}</p>
        </div>
    );
}

/**
 * Footer for app ownership and installation reminder.
 */
function SiteFooter() {
    return (
        <footer className="site-footer">
            <div className="site-footer__inner">
                <span>Promptbook Developer landing page for ptbk coder.</span>
                <span>
                    Start with <code>npm install ptbk</code>
                </span>
            </div>
        </footer>
    );
}
