import { PLANNED_MESSAGE_LIFECYCLES_BY_VIEW } from './filterPlannedMessages';
import type { PlannedMessageLifecycle } from './resolvePlannedMessageLifecycle';

/**
 * Determines whether one planned message is still part of the agent's plans.
 *
 * A planned message is still planned while it can wake its agent again — including one held back by a
 * pause and one whose starting date is still ahead. This is what decides whether it can be re-planned
 * or cancelled at all, and it is the very same set the `active` view lists.
 *
 * @param lifecycle - Stage the planned message is in.
 * @returns `true` while the planned message is not over.
 *
 * @private internal admin utility of Agents Server
 */
export function isPlannedMessageStillPlanned(lifecycle: PlannedMessageLifecycle): boolean {
    return PLANNED_MESSAGE_LIFECYCLES_BY_VIEW.active.includes(lifecycle);
}
