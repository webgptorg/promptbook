import type { UniqueIdentifier } from '@dnd-kit/core';

/**
 * Drop placement intent derived from cursor position.
 *
 * @private function of AgentsList
 */
export type DropIntent = 'before' | 'after' | 'inside';

/**
 * Drop indicator metadata for live folder moves.
 *
 * @private function of AgentsList
 */
export type DropIndicator = {
    id: UniqueIdentifier;
    intent: DropIntent;
};
