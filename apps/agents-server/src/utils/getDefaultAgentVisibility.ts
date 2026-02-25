import { getMetadataMap } from '../database/getMetadata';
import {
    DEFAULT_AGENT_VISIBILITY,
    DEFAULT_VISIBILITY_METADATA_KEY,
    LEGACY_DEFAULT_VISIBILITY_METADATA_KEY,
    parseAgentVisibility,
    type AgentVisibility,
} from './agentVisibility';

/**
 * Resolves default visibility for newly created agents from metadata.
 *
 * Prefers `DEFAULT_VISIBILITY` and falls back to the legacy key.
 *
 * @returns Visibility used for new agents.
 */
export async function getDefaultAgentVisibility(): Promise<AgentVisibility> {
    const metadata = await getMetadataMap([DEFAULT_VISIBILITY_METADATA_KEY, LEGACY_DEFAULT_VISIBILITY_METADATA_KEY]);
    const configuredVisibility =
        metadata[DEFAULT_VISIBILITY_METADATA_KEY] ?? metadata[LEGACY_DEFAULT_VISIBILITY_METADATA_KEY];

    return parseAgentVisibility(configuredVisibility, DEFAULT_AGENT_VISIBILITY);
}
