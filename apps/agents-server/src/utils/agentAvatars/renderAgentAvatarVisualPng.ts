import type { AgentBasicInformation } from '@promptbook-local/types';
import { createCanvas } from '@napi-rs/canvas';
import { createAvatarDefinitionFromAgentBasicInformation } from '../../../../../src/avatars/avatarRenderingUtils';
import { renderAvatarVisual } from '../../../../../src/avatars/renderAvatarVisual';
import type { AvatarVisualId } from '../../../../../src/avatars/types/AvatarVisualDefinition';
import { DEFAULT_AGENT_AVATAR_VISUAL_ID } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';

/**
 * Stable animation timestamp used when rasterizing the animated avatar into static PNG contexts.
 *
 * @private shared helper of agent avatar routes
 */
const STATIC_AGENT_AVATAR_FRAME_TIME_MS = 840;

/**
 * Server-side options for rasterizing one deterministic avatar visual.
 *
 * @private shared helper of agent avatar routes
 */
type RenderAgentAvatarVisualPngOptions = {
    /**
     * Output size in CSS pixels.
     */
    readonly size: number;

    /**
     * Built-in avatar visual id.
     *
     * @default `DEFAULT_AGENT_AVATAR_VISUAL_ID`
     */
    readonly visualId?: AvatarVisualId;

    /**
     * Animation timestamp used for static snapshots.
     *
     * @default `STATIC_AGENT_AVATAR_FRAME_TIME_MS`
     */
    readonly timeMs?: number;
};

/**
 * Renders one deterministic avatar visual into a PNG buffer for server-side image routes.
 *
 * @param agent - Agent metadata used to derive avatar identity and palette.
 * @param options - PNG rendering options.
 * @returns PNG buffer containing the rendered avatar.
 *
 * @private shared helper of agent avatar routes
 */
export function renderAgentAvatarVisualPng(
    agent: Pick<AgentBasicInformation, 'agentName' | 'agentHash' | 'meta'>,
    options: RenderAgentAvatarVisualPngOptions,
): Buffer {
    const { size, visualId = DEFAULT_AGENT_AVATAR_VISUAL_ID, timeMs = STATIC_AGENT_AVATAR_FRAME_TIME_MS } = options;
    const avatarDefinition = createAvatarDefinitionFromAgentBasicInformation(agent);
    const canvas = createCanvas(size, size) as unknown as HTMLCanvasElement & { toBuffer(mimeType: string): Buffer };

    // `renderAvatarVisual` expects a browser canvas shape; the node canvas only needs a tiny compatibility shim.
    (canvas as HTMLCanvasElement & { style?: HTMLCanvasElement['style'] }).style = {} as HTMLCanvasElement['style'];

    renderAvatarVisual({
        canvas,
        avatarDefinition,
        visualId,
        size,
        timeMs,
        devicePixelRatio: 1,
    });

    return canvas.toBuffer('image/png');
}
