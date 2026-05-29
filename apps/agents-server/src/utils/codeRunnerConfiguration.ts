import { execFile } from 'child_process';
import { promisify } from 'util';
import { listVpsEnvironmentVariables } from './vpsConfiguration';

const execFileAsync = promisify(execFile);

/**
 * Saved standalone VPS code-runner configuration exposed to the admin UI.
 */
export type ConfiguredCodeRunner = {
    /**
     * Runner identifier persisted in `.env`.
     */
    readonly agent: string;

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
 * Reads the currently configured standalone VPS code runner from managed environment variables.
 *
 * @returns Saved code-runner settings with fallback defaults.
 */
export async function readConfiguredCodeRunner(): Promise<ConfiguredCodeRunner> {
    const snapshot = await listVpsEnvironmentVariables();
    const environmentByKey = Object.fromEntries(snapshot.variables.map((variable) => [variable.key, variable.value])) as Record<
        string,
        string
    >;

    return {
        agent: environmentByKey.PTBK_AGENT || process.env.PTBK_AGENT || 'github-copilot',
        model: environmentByKey.PTBK_MODEL || process.env.PTBK_MODEL || 'gpt-5.4',
        thinkingLevel: environmentByKey.PTBK_THINKING_LEVEL || process.env.PTBK_THINKING_LEVEL || 'xhigh',
    };
}

/**
 * Resolves a short runner-authentication status for the configured runner.
 *
 * @param agent - Runner id.
 * @returns Human-readable status.
 */
export async function resolveCodeRunnerStatus(agent: string): Promise<string> {
    if (agent !== 'github-copilot') {
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
