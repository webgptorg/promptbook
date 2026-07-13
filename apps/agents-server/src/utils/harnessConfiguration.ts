import { execFile } from 'child_process';
import { promisify } from 'util';
import { listVpsEnvironmentVariables } from './vpsConfiguration';

const execFileAsync = promisify(execFile);

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
