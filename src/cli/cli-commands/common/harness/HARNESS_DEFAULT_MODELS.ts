import type { PromptRunnerHarnessName } from '../promptRunnerCliOptions';

/**
 * Latest OpenAI flagship used by harnesses which support OpenAI models.
 */
const OPENAI_FLAGSHIP_MODEL = 'gpt-6-astra';

/**
 * Latest Gemini model for coding and long-running agent tasks.
 */
const GEMINI_FLAGSHIP_MODEL = 'gemini-3.8-flash';

/**
 * [🕕] Default models shared by CLI execution, project initialization and the coder landing page.
 *
 * Checked against provider documentation on 2026-09-21:
 * - https://developers.openai.com/codex/models
 * - https://github.blog/changelog/2026-09-04-gpt-6-astra-is-generally-available-in-github-copilot/
 * - https://code.claude.com/docs/en/model-config
 * - https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
 * - https://qwenlm.github.io/qwen-code-docs/en/blog/updates/weekly-update-2026-08-27/
 *
 * Claude's `fable` alias follows its current flagship. OpenCode needs a provider-qualified model;
 * the Cline adapter uses Google's provider and therefore needs a Gemini model ID.
 * Keep this module free of runtime dependencies so the landing page can consume the same defaults.
 *
 * @private internal configuration of CLI harness integrations
 */
export const HARNESS_DEFAULT_MODELS = {
    'openai-codex': OPENAI_FLAGSHIP_MODEL,
    'github-copilot': OPENAI_FLAGSHIP_MODEL,
    'claude-code': 'fable',
    gemini: GEMINI_FLAGSHIP_MODEL,
    'qwen-code': 'qwen3.8-max',
    opencode: `openai/${OPENAI_FLAGSHIP_MODEL}`,
    cline: GEMINI_FLAGSHIP_MODEL,
} as const satisfies Readonly<Record<PromptRunnerHarnessName, string>>;
