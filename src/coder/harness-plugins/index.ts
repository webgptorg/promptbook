import { plugin as openai_codex } from './openai-codex/index.js';
import { plugin as claude_code } from './claude-code/index.js';
import { plugin as github_copilot } from './github-copilot/index.js';
import { plugin as cline } from './cline/index.js';
import { plugin as opencode } from './opencode/index.js';
import { plugin as gemini } from './gemini/index.js';
import { plugin as qwen_code } from './qwen-code/index.js';
import type { HarnessPlugin } from './contract.js';

/** Supported integrations; presence is never implicit project authorization. @private */
export const HARNESS_PLUGINS: readonly HarnessPlugin[] = [openai_codex, claude_code, github_copilot, cline, opencode, gemini, qwen_code];

/** Resolve a stable plugin id with an actionable configuration failure. @private */
export function getHarnessPlugin(name: string): HarnessPlugin {
    const plugin = HARNESS_PLUGINS.find((entry) => entry.definition.id === name);
    if (!plugin) throw new Error(`Unknown harness ${name}; choose ${HARNESS_PLUGINS.map((entry) => entry.definition.id).join(', ')}`);
    return plugin;
}
