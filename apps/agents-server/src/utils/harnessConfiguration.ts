import { execFile } from 'child_process';
import { promisify } from 'util';
import { spaceTrim } from 'spacetrim';
import { CODEX_CHATGPT_LOGIN_STATUS_NEEDLE, type CodexLoginMethod } from '../../../../src/book-3.0/codexLoginMethod';
import { listVpsEnvironmentVariables } from './vpsConfiguration';

const execFileAsync = promisify(execFile);

/**
 * Harness identifier of the OpenAI Codex CLI.
 *
 * @private internal constant of Agents Server Harness Auth
 */
const OPENAI_CODEX_HARNESS_ID = 'openai-codex';

/**
 * OpenAI API-key environment variables that make the Codex CLI bill per token and hide an active
 * ChatGPT subscription login from `codex login status`.
 *
 * @private internal constant of Agents Server Harness Auth
 */
const OPENAI_CODEX_API_KEY_ENVIRONMENT_KEYS = ['OPENAI_API_KEY', 'OPENAI_BASE_URL', 'CODEX_API_KEY'] as const;

/**
 * Saved standalone VPS harness configuration exposed to the admin UI.
 *
 * @private internal utility of Agents Server Harness Auth
 */
export type ConfiguredHarness = {
    /**
     * Harness identifier persisted in `.env`.
     */
    readonly harness: string;

    /**
     * Model identifier persisted in `.env`.
     */
    readonly model: string;

    /**
     * Thinking level persisted in `.env`.
     */
    readonly thinkingLevel: string;
};

/**
 * Reads the currently configured standalone VPS harness from managed environment variables.
 *
 * @returns Saved harness settings with fallback defaults.
 *
 * @private internal utility of Agents Server Harness Auth
 */
export async function readConfiguredHarness(): Promise<ConfiguredHarness> {
    const snapshot = await listVpsEnvironmentVariables();
    const environmentByKey = Object.fromEntries(snapshot.variables.map((variable) => [variable.key, variable.value])) as Record<
        string,
        string
    >;

    return {
        harness: environmentByKey.PTBK_HARNESS || process.env.PTBK_HARNESS || process.env.PTBK_AGENT || 'github-copilot',
        model: environmentByKey.PTBK_MODEL || process.env.PTBK_MODEL || 'gpt-5.4',
        thinkingLevel: environmentByKey.PTBK_THINKING_LEVEL || process.env.PTBK_THINKING_LEVEL || 'xhigh',
    };
}

/**
 * Resolves a short authentication status for the configured harness.
 *
 * @param harness - Harness id.
 * @returns Human-readable status.
 *
 * @private internal utility of Agents Server Harness Auth
 */
export async function resolveHarnessStatus(harness: string): Promise<string> {
    if (harness !== 'github-copilot') {
        return 'Status check is currently available for GitHub Copilot CLI only.';
    }

    try {
        const { stdout, stderr } = await execFileAsync('copilot', ['auth', 'status'], {
            timeout: 10_000,
            maxBuffer: 128 * 1024,
        });

        return [stdout, stderr].filter(Boolean).join('\n').trim() || 'GitHub Copilot CLI returned no status output.';
    } catch (error) {
        return error instanceof Error ? error.message : 'GitHub Copilot CLI status check failed.';
    }
}

/**
 * Resolved harness authentication status shown by the Harness Auth admin page.
 *
 * @private internal utility of Agents Server Harness Auth
 */
export type HarnessAuthenticationStatus = {
    /**
     * Human-readable status line for the configured harness.
     */
    readonly status: string;

    /**
     * Which login method the OpenAI Codex harness currently uses, or `null` for other harnesses.
     */
    readonly codexLoginMethod: CodexLoginMethod | null;
};

/**
 * Resolves the authentication status shown by the Harness Auth admin page for the configured harness.
 *
 * @param harness - Harness id.
 * @returns Status line plus the resolved OpenAI Codex login method when the harness is OpenAI Codex.
 *
 * @private internal utility of Agents Server Harness Auth
 */
export async function resolveHarnessAuthenticationStatus(harness: string): Promise<HarnessAuthenticationStatus> {
    if (harness === OPENAI_CODEX_HARNESS_ID) {
        return resolveOpenAiCodexAuthenticationStatus();
    }

    return {
        status: await resolveHarnessStatus(harness),
        codexLoginMethod: null,
    };
}

/**
 * Resolves whether OpenAI Codex currently authenticates with the ChatGPT subscription or the
 * `OPENAI_API_KEY`, mirroring the runtime decision made by the Codex runner script.
 *
 * @returns Status line and the resolved Codex login method.
 *
 * @private internal utility of Agents Server Harness Auth
 */
async function resolveOpenAiCodexAuthenticationStatus(): Promise<HarnessAuthenticationStatus> {
    if (await isOpenAiCodexChatgptLoginActive()) {
        return {
            status: spaceTrim(`
                Signed in with a ChatGPT subscription.
                OpenAI Codex uses the ChatGPT account and ignores any OPENAI_API_KEY.
            `),
            codexLoginMethod: 'chatgpt',
        };
    }

    if (await isOpenAiApiKeyConfigured()) {
        return {
            status: spaceTrim(`
                Using the OpenAI API key (OPENAI_API_KEY).
                OpenAI Codex is billed per token through the OpenAI API. Sign in below to switch to a ChatGPT subscription.
            `),
            codexLoginMethod: 'api',
        };
    }

    return {
        status: spaceTrim(`
            Not signed in.
            There is no ChatGPT subscription login and no OPENAI_API_KEY configured, so OpenAI Codex cannot answer chats yet.
            Start the authentication wizard below to sign in with "codex login --device-auth".
        `),
        codexLoginMethod: 'unknown',
    };
}

/**
 * Checks whether the OpenAI Codex CLI reports an active ChatGPT subscription login.
 *
 * @returns `true` when Codex is logged in with a ChatGPT account.
 *
 * @private internal utility of Agents Server Harness Auth
 */
async function isOpenAiCodexChatgptLoginActive(): Promise<boolean> {
    return (await runOpenAiCodexLoginStatus()).includes(CODEX_CHATGPT_LOGIN_STATUS_NEEDLE);
}

/**
 * Runs `codex login status` with the API-key environment variables removed and returns the combined
 * output, because the API-key variables make Codex report API-key authentication and hide an active
 * ChatGPT login, and Codex prints the ChatGPT status line to stderr.
 *
 * @returns Combined stdout and stderr, or an empty string when the CLI is unavailable.
 *
 * @private internal utility of Agents Server Harness Auth
 */
async function runOpenAiCodexLoginStatus(): Promise<string> {
    try {
        const { stdout, stderr } = await execFileAsync('codex', ['login', 'status'], {
            timeout: 10_000,
            maxBuffer: 128 * 1024,
            env: buildOpenAiCodexEnvironmentWithoutApiKey(),
        });

        return [stdout, stderr].join('\n');
    } catch (error) {
        // `codex login status` exits non-zero when signed out; still inspect any captured output.
        const execError = error as { readonly stdout?: string; readonly stderr?: string };
        return [execError.stdout ?? '', execError.stderr ?? ''].join('\n');
    }
}

/**
 * Builds a child-process environment for the Codex CLI with the OpenAI API-key variables removed.
 *
 * @returns Process environment without the OpenAI API-key variables.
 *
 * @private internal utility of Agents Server Harness Auth
 */
function buildOpenAiCodexEnvironmentWithoutApiKey(): NodeJS.ProcessEnv {
    const environment: NodeJS.ProcessEnv = { ...process.env };

    for (const environmentKey of OPENAI_CODEX_API_KEY_ENVIRONMENT_KEYS) {
        delete environment[environmentKey];
    }

    return environment;
}

/**
 * Checks whether an OpenAI API key is configured in the managed VPS environment or the process env.
 *
 * @returns `true` when `OPENAI_API_KEY` is defined.
 *
 * @private internal utility of Agents Server Harness Auth
 */
async function isOpenAiApiKeyConfigured(): Promise<boolean> {
    const snapshot = await listVpsEnvironmentVariables();
    const openAiApiKeyRecord = snapshot.variables.find((variable) => variable.key === 'OPENAI_API_KEY');

    return Boolean(openAiApiKeyRecord?.isDefined);
}
