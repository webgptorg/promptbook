import { spaceTrim } from 'spacetrim';
import type { BookLanguageDocumentationExample } from './BookLanguageDocumentationExample';

/**
 * End-to-end examples used by the standalone Book language documentation.
 *
 * These are intentionally compact but complete, so they can be copy-pasted and
 * used as practical starting points.
 */
export const bookLanguageDocumentationExamples: ReadonlyArray<BookLanguageDocumentationExample> = [
    {
        id: 'minimal-hello-world-agent',
        title: 'Minimal hello-world agent',
        goal: 'Create the smallest useful agent with identity and greeting.',
        source: spaceTrim(`
            Hello World Agent

            PERSONA You are a concise and friendly assistant.
            INITIAL MESSAGE Hello! I am ready to help.
            CLOSED
        `),
        walkthrough: [
            'The first line (`Hello World Agent`) is the agent name.',
            '`PERSONA` defines identity and style of behavior.',
            '`INITIAL MESSAGE` sets a deterministic first message for a new chat.',
            '`CLOSED` prevents conversational self-modification.',
        ],
    },
    {
        id: 'tool-using-browser-search-agent',
        title: 'Tool-using agent (Browser + Search engine)',
        goal: 'Enable internet research with clear sourcing behavior.',
        source: spaceTrim(`
            Web Research Assistant

            PERSONA You are a research assistant focused on fresh and verifiable information.
            USE SEARCH ENGINE Prefer official sources and recent publications.
            USE BROWSER
            RULE Verify important claims across multiple sources when possible.
            RULE Include source links in your final answer.
            INITIAL MESSAGE Ask me what topic you want to research and how deep the report should be.
        `),
        walkthrough: [
            '`USE SEARCH ENGINE` provides web search tooling and optional search instructions.',
            '`USE BROWSER` enables URL fetching and interactive browsing tools.',
            '`RULE` commitments make reliability behavior explicit and repeatable.',
            'This pattern is ideal for current-events and fact-checking agents.',
        ],
    },
    {
        id: 'rule-and-knowledge-agent',
        title: 'Agent with RULE and KNOWLEDGE',
        goal: 'Ground responses in explicit constraints and curated sources.',
        source: spaceTrim(`
            Support Policy Assistant

            PERSONA You answer questions about support policy.
            KNOWLEDGE Refunds are available within 30 days with proof of purchase.
            KNOWLEDGE https://example.com/support-policy
            RULE If a policy item is missing in available knowledge, say it explicitly.
            RULE Never invent legal or policy statements.
            INITIAL MESSAGE I can explain refund and support rules from provided knowledge.
        `),
        walkthrough: [
            '`KNOWLEDGE` may be inline text or an external URL/document.',
            '`RULE` commitments define non-negotiable behavior constraints.',
            'Combining both creates predictable, grounded policy responses.',
            'Use this pattern for compliance, support, and internal procedures.',
        ],
    },
    {
        id: 'memory-agent-with-long-term-memory',
        title: 'MEMORY agent with long-term memory',
        goal: 'Persist user preferences across conversations.',
        source: spaceTrim(`
            Customer Success Memory Agent

            PERSONA You are a customer success assistant for a SaaS product.
            MEMORY Remember product setup, user goals, and communication preferences.
            RULE Store only user-approved preferences and project context.
            RULE Never store secrets or sensitive data unless explicitly requested and allowed.
            INITIAL MESSAGE I can remember your setup and preferences for future sessions.
        `),
        walkthrough: [
            '`MEMORY` adds runtime memory tools and memory-specific system guidance.',
            '`RULE` commitments narrow what should be remembered to reduce privacy risks.',
            'In Agents Server, memory is runtime-backed and user-scoped.',
            'Use this for assistants that must preserve context over time.',
        ],
    },
    {
        id: 'use-project-and-wallet-integration-agent',
        title: 'USE PROJECT and WALLET external integration',
        goal: 'Work with GitHub repositories and wallet-backed credentials.',
        source: spaceTrim(`
            Repository Maintainer

            PERSONA You maintain a GitHub repository and prepare safe pull requests.
            USE PROJECT https://github.com/acme/website
            WALLET Store credentials for repository operations.
            RULE Before editing files, explain the planned change and impacted paths.
            RULE Never reveal raw credentials in chat output.
            INITIAL MESSAGE I can inspect the repository and help you prepare PR-ready changes.
        `),
        walkthrough: [
            '`USE PROJECT` enables repository tools for listing, reading, editing files, and creating PRs.',
            'Credentials are resolved from wallet records at runtime in Agents Server.',
            '`WALLET` is kept here as a compatibility marker, but current Book 2.0 parsing treats it as deprecated/ignored.',
            'In current runtime behavior, wallet-backed integrations are driven by commitments such as `USE PROJECT` and `USE EMAIL`.',
        ],
    },
    {
        id: 'agents-team-example',
        title: 'Agents TEAM (with in-book teammates)',
        goal: 'Delegate sub-tasks to specialized teammates.',
        source: spaceTrim(`
            Team Manager

            PERSONA You coordinate specialists and deliver one consolidated answer.
            TEAM Ask {Legal Reviewer} for legal constraints and {Implementation Reviewer} for technical feasibility.
            RULE Always summarize teammate outputs into one action plan.

            ---

            Legal Reviewer

            FROM VOID
            PERSONA You are a legal risk reviewer.
            RULE Flag legal/compliance risk and uncertainty clearly.
            CLOSED

            ---

            Implementation Reviewer

            FROM VOID
            PERSONA You review implementation effort and delivery risk.
            RULE Estimate complexity and identify blockers.
            CLOSED
        `),
        walkthrough: [
            'The main agent delegates via `TEAM` commitment.',
            'References in `{...}` are resolved against embedded agents inside the same book (split by `---`).',
            'Each teammate can be isolated with `FROM VOID` for deterministic specialization.',
            'This pattern works well for multi-role review and decision support.',
        ],
    },
];
