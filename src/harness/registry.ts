import { plugin as claudeCode } from './plugins/claude-code/index.js';
import { plugin as cline } from './plugins/cline/index.js';
import { plugin as gemini } from './plugins/gemini/index.js';
import { plugin as githubCopilot } from './plugins/github-copilot/index.js';
import { plugin as openaiCodex } from './plugins/openai-codex/index.js';
import { plugin as opencode } from './plugins/opencode/index.js';
import { plugin as qwenCode } from './plugins/qwen-code/index.js';
import type { HarnessPlugin } from './types.js';

/**
 * Every supported harness integration (featured first).
 *
 * @private harness registry
 */
export const HARNESS_PLUGINS: readonly HarnessPlugin[] = [openaiCodex, claudeCode, githubCopilot, cline, opencode, gemini, qwenCode];

/**
 * Finds a plugin by identifier.
 *
 * @private harness registry
 */
export function harnessPlugin(id: string): HarnessPlugin | undefined {
    return HARNESS_PLUGINS.find((plugin) => plugin.id === id);
}

/**
 * Display name of a harness identifier (the identifier itself when unknown).
 *
 * @private harness registry
 */
export function harnessName(id: string | undefined): string {
    if (!id) return 'unknown harness';
    return harnessPlugin(id)?.displayName ?? id;
}
