import type { RunOptions } from '../../run-codex-prompts/cli/RunOptions';
import type { AgentRunOptions } from '../AgentRunOptions';

/**
 * Converts `ptbk agent-folder` options into the shared runner option shape.
 */
export function createCoderRunOptionsForAgent(options: AgentRunOptions): RunOptions {
    return {
        dryRun: false,
        context: undefined,
        testCommand: undefined,
        preserveLogs: false,
        noUi: options.noUi,
        thinkingLevel: options.thinkingLevel,
        waitForUser: false,
        noCommit: options.noCommit,
        ignoreGitChanges: options.ignoreGitChanges,
        normalizeLineEndings: options.normalizeLineEndings,
        allowCredits: options.allowCredits,
        autoMigrate: false,
        allowDestructiveAutoMigrate: false,
        autoPush: options.autoPush,
        autoPull: options.autoPull,
        agentName: options.agentName,
        model: options.model,
        priority: 0,
    };
}
