import type { string_agent_hash, string_agent_name } from '../../types/string_agent_name';
import type { string_color } from '../../types/string_person_fullname';

/**
 * Normalized identity payload used by all canvas avatar visuals.
 *
 * @private shared contract for the avatar rendering system
 */
export type AvatarDefinition = {
    /**
     * Human-readable name of the agent.
     */
    readonly agentName: string_agent_name;

    /**
     * Stable hash of the agent.
     */
    readonly agentHash: string_agent_hash;

    /**
     * Ordered list of agent colors used to derive a palette.
     */
    readonly colors: ReadonlyArray<string_color>;
};
