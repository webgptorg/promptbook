import type { DropIntent } from './DropIndicator';

/**
 * Determines the drop intent based on active and target rectangles.
 *
 * @param activeRect - Active drag rectangle.
 * @param overRect - Target drop rectangle.
 * @returns Drop intent for inside/before/after placement.
 * @private function of AgentsList
 */
export const getDropIntentFromRects = (activeRect: ClientRect | null, overRect: ClientRect): DropIntent => {
    if (!activeRect) {
        return 'inside';
    }
    const activeCenterY = activeRect.top + activeRect.height / 2;
    const insideTop = overRect.top + overRect.height / 4;
    const insideBottom = overRect.top + (overRect.height * 3) / 4;
    if (activeCenterY > insideTop && activeCenterY < insideBottom) {
        return 'inside';
    }
    return activeCenterY >= insideBottom ? 'after' : 'before';
};
