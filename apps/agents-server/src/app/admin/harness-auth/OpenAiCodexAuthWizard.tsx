'use client';

import { KeyRound, ListChecks, Sparkles } from 'lucide-react';
import type { CodexLoginMethod } from '../../../../../../src/book-3.0/codexLoginMethod';
import { Card } from '../../../components/Homepage/Card';

/**
 * Props for the OpenAI Codex authentication wizard.
 */
type OpenAiCodexAuthWizardProps = {
    /**
     * Login method OpenAI Codex currently uses, or `null` while it is still being resolved.
     */
    readonly codexLoginMethod: CodexLoginMethod | null;
};

/**
 * One OpenAI Codex authentication option explained to the admin.
 */
type CodexAuthenticationOption = {
    /**
     * Login method this option represents.
     */
    readonly method: CodexLoginMethod;

    /**
     * Short option title, also reused as the "currently used" badge label.
     */
    readonly title: string;

    /**
     * Whether this option is the recommended one.
     */
    readonly isRecommended: boolean;

    /**
     * Longer explanation of how the option authenticates and how it is billed.
     */
    readonly description: string;
};

/**
 * The two ways the OpenAI Codex harness can authenticate, shown side by side so the admin understands
 * the difference between the ChatGPT subscription and the OpenAI API key.
 */
const CODEX_AUTHENTICATION_OPTIONS: ReadonlyArray<CodexAuthenticationOption> = [
    {
        method: 'chatgpt',
        title: 'ChatGPT subscription',
        isRecommended: true,
        description:
            'Uses the ChatGPT account (Plus, Pro, Business, or Enterprise) that you sign in below. The quota included in that subscription is used and there are no per-token OpenAI API charges. It needs a one-time interactive sign-in with "codex login --device-auth".',
    },
    {
        method: 'api',
        title: 'OpenAI API key',
        isRecommended: false,
        description:
            'Uses the OPENAI_API_KEY environment variable. OpenAI Codex is then billed per token through the OpenAI API. No interactive sign-in is needed — just set OPENAI_API_KEY on the Environment variables page.',
    },
];

/**
 * Step-by-step instructions that walk an admin who has never done it through the device sign-in.
 */
const CODEX_AUTHENTICATION_STEPS: ReadonlyArray<string> = [
    'Make sure OpenAI Codex is selected as the harness above and saved.',
    'Click "Authenticate saved harness" below to run "codex login --device-auth" in the terminal.',
    'Wait for the terminal to print a verification URL and a short one-time code.',
    'Open that URL in your browser, sign in to ChatGPT, enter the code, and approve access.',
    'When the terminal reports success it closes on its own; this page then shows ChatGPT subscription as the current method.',
];

/**
 * Guided wizard that explains OpenAI Codex authentication, shows which method is currently used, and
 * walks the admin through signing in with the ChatGPT subscription via `codex login --device-auth`.
 */
export function OpenAiCodexAuthWizard({ codexLoginMethod }: OpenAiCodexAuthWizardProps) {
    const activeOption = CODEX_AUTHENTICATION_OPTIONS.find((option) => option.method === codexLoginMethod) ?? null;

    return (
        <Card className="hover:border-gray-200 hover:shadow-md">
            <div className="space-y-6">
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-slate-900">Sign in to OpenAI Codex</h2>
                    <p className="text-sm text-slate-600">
                        The OpenAI Codex harness can run either on your ChatGPT subscription or on an OpenAI API key.
                        Sign in below to use the subscription instead of paying per token.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">Currently used:</span>
                    <CodexCurrentMethodBadge activeOption={activeOption} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {CODEX_AUTHENTICATION_OPTIONS.map((option) => (
                        <CodexAuthenticationOptionCard
                            key={option.method}
                            option={option}
                            isActive={option.method === codexLoginMethod}
                        />
                    ))}
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-slate-500" />
                        <p className="text-sm font-semibold text-slate-700">
                            How to sign in with your ChatGPT subscription
                        </p>
                    </div>
                    <ol className="mt-3 list-decimal space-y-1 pl-6 text-sm text-slate-600">
                        {CODEX_AUTHENTICATION_STEPS.map((step) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                </div>
            </div>
        </Card>
    );
}

/**
 * Props for the current-method badge.
 */
type CodexCurrentMethodBadgeProps = {
    /**
     * Currently active authentication option, or `null` when Codex is not signed in.
     */
    readonly activeOption: CodexAuthenticationOption | null;
};

/**
 * Small colored badge that names the OpenAI Codex authentication method currently in use.
 */
function CodexCurrentMethodBadge({ activeOption }: CodexCurrentMethodBadgeProps) {
    if (!activeOption) {
        return (
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Not signed in
            </span>
        );
    }

    if (activeOption.method === 'chatgpt') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                {activeOption.title}
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            <KeyRound className="h-3.5 w-3.5" />
            {activeOption.title}
        </span>
    );
}

/**
 * Props for one explained authentication option card.
 */
type CodexAuthenticationOptionCardProps = {
    /**
     * Option to render.
     */
    readonly option: CodexAuthenticationOption;

    /**
     * Whether this option is the one currently in use.
     */
    readonly isActive: boolean;
};

/**
 * One explanation card describing an OpenAI Codex authentication option, highlighted when it is active.
 */
function CodexAuthenticationOptionCard({ option, isActive }: CodexAuthenticationOptionCardProps) {
    const Icon = option.method === 'chatgpt' ? Sparkles : KeyRound;

    return (
        <div
            className={`rounded-lg border px-4 py-3 ${
                isActive ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'
            }`}
        >
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-slate-500" />
                <p className="text-sm font-semibold text-slate-800">{option.title}</p>
                {option.isRecommended ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Recommended
                    </span>
                ) : null}
                {isActive ? (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        In use
                    </span>
                ) : null}
            </div>
            <p className="mt-2 text-sm text-slate-600">{option.description}</p>
        </div>
    );
}
