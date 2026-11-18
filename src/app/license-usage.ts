import type { AgentView, BrowserDetailView, ToolView } from '../engine/snapshot.js';

/**
 * Content-free commercial counts. Unknown is null, never an invented zero or an enforcement decision.
 * These counts are separate from the frozen heartbeat v1 `agents` and `members` meanings.
 *
 * @private App licensing diagnostics
 */
export type LicenseUsage = {
    readonly version: 1;
    readonly specialists: number;
    readonly controllingUsers: number | null;
    readonly harnessInstances: number | null;
    readonly browserProfiles: number | null;
};

/**
 * Counts the engine's current inventory without copying a name, path, account, key or content into the result.
 * Core/engine roles are excluded; retained tool contexts still count until they finish.
 *
 * @private App licensing diagnostics
 */
export function summarizeLicenseUsage(input: {
    readonly agents: readonly Pick<AgentView, 'role'>[];
    readonly tools?: readonly Pick<ToolView, 'type' | 'isEnabled' | 'retained'>[];
    readonly browsers?: readonly Pick<BrowserDetailView, 'profilePath' | 'isEnabled' | 'retained'>[];
    readonly controllingUsers: number | null;
}): LicenseUsage {
    return {
        version: 1,
        specialists: input.agents.filter((agent) => !agent.role).length,
        controllingUsers: input.controllingUsers,
        harnessInstances: input.tools ? input.tools.filter((tool) => tool.type === 'HARNESS' && (tool.isEnabled || tool.retained)).length : null,
        browserProfiles: input.browsers ? new Set(input.browsers.filter((browser) => browser.isEnabled || browser.retained).map((browser) => browser.profilePath)).size : null,
    };
}
