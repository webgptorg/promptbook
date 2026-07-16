'use client';

import { DEVELOPER_AGENT_BOOK } from '@/data/developerAgentBook';
import { Avatar, createAvatarDefinitionFromAgentBasicInformation } from '@promptbook-source/avatars';
import type { AvatarVisualId } from '@promptbook-source/avatars/types/AvatarVisualDefinition';
import { parseAgentSource } from '@promptbook-source/book-2.0/agent-source/parseAgentSource';
import { resolveAgentAvatarVisualId } from '@promptbook-source/utils/agents/resolveAgentAvatarImageUrl';

/**
 * Size of the live demo avatar canvas in CSS pixels.
 */
const LIVE_DEMO_AGENT_AVATAR_SIZE = 120;

/**
 * Built-in fallback visual used by the landing live terminal sample.
 *
 * The actual Promptbook Developer coder agent in this repository declares the same visual,
 * while explicit `META AVATAR` / `META VISUAL` values in the demo source still take precedence.
 */
const LIVE_DEMO_AGENT_AVATAR_VISUAL_ID: AvatarVisualId = 'ascii-octopus';

/**
 * Parsed source of the default developer agent shown in the live terminal sample.
 */
const LIVE_DEMO_AGENT_BASIC_INFORMATION = parseAgentSource(DEVELOPER_AGENT_BOOK);

/**
 * Stable avatar identity used by the shared avatar renderer.
 */
const LIVE_DEMO_AGENT_AVATAR_DEFINITION = createAvatarDefinitionFromAgentBasicInformation(
    LIVE_DEMO_AGENT_BASIC_INFORMATION,
);

/**
 * Built-in visual selected for the live demo avatar.
 */
const LIVE_DEMO_AGENT_RESOLVED_AVATAR_VISUAL_ID = resolveAgentAvatarVisualId(
    LIVE_DEMO_AGENT_BASIC_INFORMATION,
    LIVE_DEMO_AGENT_AVATAR_VISUAL_ID,
);

/**
 * Renders the same shared `AsciiOctopus` avatar visual used by the web avatar previews.
 */
export function SharedAgentTerminalVisual() {
    return (
        <div className="flex justify-center py-2" aria-hidden>
            <Avatar
                avatarDefinition={LIVE_DEMO_AGENT_AVATAR_DEFINITION}
                visualId={LIVE_DEMO_AGENT_RESOLVED_AVATAR_VISUAL_ID}
                size={LIVE_DEMO_AGENT_AVATAR_SIZE}
            />
        </div>
    );
}
