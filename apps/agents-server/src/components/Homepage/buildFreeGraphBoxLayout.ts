/**
 * Default number of relaxation passes used by the free graph box layout.
 *
 * @private function of AgentsGraph
 */
const DEFAULT_LAYOUT_ITERATION_COUNT = 96;

/**
 * Minimum distance used when two layout boxes start at the same point.
 *
 * @private function of AgentsGraph
 */
const MINIMUM_DISTANCE = 0.001;

/**
 * Default weight for a graph relation when no explicit weight is provided.
 *
 * @private function of AgentsGraph
 */
const DEFAULT_LINK_WEIGHT = 1;

/**
 * Layout box used by the deterministic free graph layout.
 *
 * @private function of AgentsGraph
 */
export type FreeGraphBoxLayoutItem = {
    id: string;
    width: number;
    height: number;
    orderIndex: number;
};

/**
 * Weighted relationship between two layout boxes.
 *
 * @private function of AgentsGraph
 */
export type FreeGraphBoxLayoutLink = {
    sourceId: string;
    targetId: string;
    weight?: number;
};

/**
 * Normalized top-left layout position for one box.
 *
 * @private function of AgentsGraph
 */
export type FreeGraphBoxLayoutPosition = {
    x: number;
    y: number;
};

/**
 * Options controlling the deterministic free graph layout.
 *
 * @private function of AgentsGraph
 */
export type FreeGraphBoxLayoutOptions = {
    paddingX: number;
    paddingY: number;
    gapX: number;
    gapY: number;
    relationshipDistance: number;
    relationshipStrength: number;
    centerPullStrength: number;
    centerItemId?: string;
    iterationCount?: number;
};

/**
 * Result of laying out graph boxes inside one parent coordinate system.
 *
 * @private function of AgentsGraph
 */
export type FreeGraphBoxLayoutResult = {
    width: number;
    height: number;
    positionsById: Map<string, FreeGraphBoxLayoutPosition>;
};

/**
 * Mutable item state used during layout relaxation.
 *
 * @private function of AgentsGraph
 */
type FreeGraphBoxLayoutState = FreeGraphBoxLayoutItem & {
    x: number;
    y: number;
    initialX: number;
    initialY: number;
    isCentered: boolean;
};

/**
 * Integer center-out grid coordinate used for deterministic initial placement.
 *
 * @private function of AgentsGraph
 */
type CenterOutCoordinate = {
    column: number;
    row: number;
};

/**
 * Return the relationship weight attached to a layout item.
 *
 * @param links - Weighted graph links.
 * @returns Relationship weight indexed by item id.
 *
 * @private function of AgentsGraph
 */
function buildRelationshipWeightByItemId(links: ReadonlyArray<FreeGraphBoxLayoutLink>): Map<string, number> {
    const relationshipWeightByItemId = new Map<string, number>();

    links.forEach((link) => {
        const weight = link.weight ?? DEFAULT_LINK_WEIGHT;
        relationshipWeightByItemId.set(link.sourceId, (relationshipWeightByItemId.get(link.sourceId) ?? 0) + weight);
        relationshipWeightByItemId.set(link.targetId, (relationshipWeightByItemId.get(link.targetId) ?? 0) + weight);
    });

    return relationshipWeightByItemId;
}

/**
 * Sort layout boxes so the most structurally important item starts near the middle.
 *
 * @param items - Source layout boxes.
 * @param links - Weighted graph links.
 * @param centerItemId - Optional item that must remain in the visual center.
 * @returns Ordered layout boxes.
 *
 * @private function of AgentsGraph
 */
function sortLayoutItemsByImportance(
    items: ReadonlyArray<FreeGraphBoxLayoutItem>,
    links: ReadonlyArray<FreeGraphBoxLayoutLink>,
    centerItemId: string | undefined,
): FreeGraphBoxLayoutItem[] {
    const relationshipWeightByItemId = buildRelationshipWeightByItemId(links);

    return [...items].sort((left, right) => {
        if (left.id === centerItemId) {
            return -1;
        }
        if (right.id === centerItemId) {
            return 1;
        }

        const rightWeight = relationshipWeightByItemId.get(right.id) ?? 0;
        const leftWeight = relationshipWeightByItemId.get(left.id) ?? 0;
        if (leftWeight !== rightWeight) {
            return rightWeight - leftWeight;
        }

        return left.orderIndex - right.orderIndex;
    });
}

/**
 * Build deterministic center-out grid coordinates.
 *
 * @param count - Number of coordinates to build.
 * @returns Center-first coordinate list.
 *
 * @private function of AgentsGraph
 */
function buildCenterOutCoordinates(count: number): CenterOutCoordinate[] {
    const coordinates: CenterOutCoordinate[] = [{ column: 0, row: 0 }];

    for (let radius = 1; coordinates.length < count; radius += 1) {
        for (let column = -radius; column <= radius && coordinates.length < count; column += 1) {
            coordinates.push({ column, row: -radius });
        }

        for (let row = -radius + 1; row <= radius && coordinates.length < count; row += 1) {
            coordinates.push({ column: radius, row });
        }

        for (let column = radius - 1; column >= -radius && coordinates.length < count; column -= 1) {
            coordinates.push({ column, row: radius });
        }

        for (let row = radius - 1; row >= -radius + 1 && coordinates.length < count; row -= 1) {
            coordinates.push({ column: -radius, row });
        }
    }

    return coordinates.slice(0, count);
}

/**
 * Create mutable layout state with deterministic center-out initial placement.
 *
 * @param items - Ordered layout boxes.
 * @param options - Layout tuning options.
 * @returns Mutable state objects for relaxation.
 *
 * @private function of AgentsGraph
 */
function createInitialLayoutState(
    items: ReadonlyArray<FreeGraphBoxLayoutItem>,
    options: FreeGraphBoxLayoutOptions,
): FreeGraphBoxLayoutState[] {
    const coordinates = buildCenterOutCoordinates(items.length);
    const widestItem = Math.max(...items.map((item) => item.width), 1);
    const tallestItem = Math.max(...items.map((item) => item.height), 1);
    const cellWidth = widestItem + options.gapX * 2;
    const cellHeight = tallestItem + options.gapY * 2;

    return items.map((item, index) => {
        const coordinate = coordinates[index] ?? { column: 0, row: 0 };
        const rowOffset = Math.abs(coordinate.row % 2) * cellWidth * 0.18;
        const x = coordinate.column * cellWidth + rowOffset;
        const y = coordinate.row * cellHeight;

        return {
            ...item,
            x,
            y,
            initialX: x,
            initialY: y,
            isCentered: item.id === options.centerItemId,
        };
    });
}

/**
 * Move one relaxed layout state unless it is fixed to the center.
 *
 * @param state - Mutable state to move.
 * @param deltaX - Horizontal movement.
 * @param deltaY - Vertical movement.
 *
 * @private function of AgentsGraph
 */
function moveLayoutState(state: FreeGraphBoxLayoutState, deltaX: number, deltaY: number): void {
    if (state.isCentered) {
        return;
    }

    state.x += deltaX;
    state.y += deltaY;
}

/**
 * Relax relationship links so connected boxes stay in a shared neighborhood.
 *
 * @param stateById - Mutable layout state indexed by id.
 * @param links - Weighted graph links.
 * @param options - Layout tuning options.
 *
 * @private function of AgentsGraph
 */
function relaxRelationshipLinks(
    stateById: ReadonlyMap<string, FreeGraphBoxLayoutState>,
    links: ReadonlyArray<FreeGraphBoxLayoutLink>,
    options: FreeGraphBoxLayoutOptions,
): void {
    links.forEach((link) => {
        const sourceState = stateById.get(link.sourceId);
        const targetState = stateById.get(link.targetId);

        if (!sourceState || !targetState || sourceState === targetState) {
            return;
        }

        const deltaX = targetState.x - sourceState.x;
        const deltaY = targetState.y - sourceState.y;
        const distance = Math.max(MINIMUM_DISTANCE, Math.hypot(deltaX, deltaY));
        const preferredDistance =
            options.relationshipDistance + Math.max(sourceState.width, targetState.width) * 0.35;
        const weight = Math.max(DEFAULT_LINK_WEIGHT, link.weight ?? DEFAULT_LINK_WEIGHT);
        const movement = (distance - preferredDistance) * options.relationshipStrength * Math.min(weight, 4);
        const moveX = (deltaX / distance) * movement;
        const moveY = (deltaY / distance) * movement;

        if (sourceState.isCentered && targetState.isCentered) {
            return;
        }

        if (sourceState.isCentered) {
            moveLayoutState(targetState, -moveX, -moveY);
            return;
        }

        if (targetState.isCentered) {
            moveLayoutState(sourceState, moveX, moveY);
            return;
        }

        moveLayoutState(sourceState, moveX / 2, moveY / 2);
        moveLayoutState(targetState, -moveX / 2, -moveY / 2);
    });
}

/**
 * Push overlapping boxes apart while preserving a deterministic direction for identical centers.
 *
 * @param states - Mutable layout states.
 * @param options - Layout tuning options.
 *
 * @private function of AgentsGraph
 */
function separateOverlappingBoxes(states: ReadonlyArray<FreeGraphBoxLayoutState>, options: FreeGraphBoxLayoutOptions): void {
    for (let leftIndex = 0; leftIndex < states.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < states.length; rightIndex += 1) {
            const leftState = states[leftIndex];
            const rightState = states[rightIndex];

            if (!leftState || !rightState) {
                continue;
            }

            const deltaX = rightState.x - leftState.x;
            const deltaY = rightState.y - leftState.y;
            const overlapX = (leftState.width + rightState.width) / 2 + options.gapX - Math.abs(deltaX);
            const overlapY = (leftState.height + rightState.height) / 2 + options.gapY - Math.abs(deltaY);

            if (overlapX <= 0 || overlapY <= 0) {
                continue;
            }

            const isHorizontalSeparation = overlapX < overlapY;
            const fallbackDirection = leftIndex % 2 === 0 ? 1 : -1;
            const direction = isHorizontalSeparation
                ? deltaX === 0
                    ? fallbackDirection
                    : Math.sign(deltaX)
                : deltaY === 0
                ? fallbackDirection
                : Math.sign(deltaY);
            const movement = (isHorizontalSeparation ? overlapX : overlapY) / 2;
            const moveX = isHorizontalSeparation ? direction * movement : 0;
            const moveY = isHorizontalSeparation ? 0 : direction * movement;

            if (leftState.isCentered && rightState.isCentered) {
                continue;
            }

            if (leftState.isCentered) {
                moveLayoutState(rightState, moveX * 2, moveY * 2);
                continue;
            }

            if (rightState.isCentered) {
                moveLayoutState(leftState, -moveX * 2, -moveY * 2);
                continue;
            }

            moveLayoutState(leftState, -moveX, -moveY);
            moveLayoutState(rightState, moveX, moveY);
        }
    }
}

/**
 * Pull boxes gently toward their seeded positions so unrelated nodes do not drift indefinitely.
 *
 * @param states - Mutable layout states.
 * @param centerPullStrength - Strength of the center pull.
 *
 * @private function of AgentsGraph
 */
function applyInitialPositionPull(states: ReadonlyArray<FreeGraphBoxLayoutState>, centerPullStrength: number): void {
    states.forEach((state) => {
        if (state.isCentered) {
            state.x = 0;
            state.y = 0;
            return;
        }

        moveLayoutState(state, (state.initialX - state.x) * centerPullStrength, (state.initialY - state.y) * centerPullStrength);
    });
}

/**
 * Convert relaxed center coordinates to normalized top-left parent coordinates.
 *
 * @param states - Relaxed layout states.
 * @param options - Layout tuning options.
 * @returns Normalized layout result.
 *
 * @private function of AgentsGraph
 */
function normalizeLayoutState(
    states: ReadonlyArray<FreeGraphBoxLayoutState>,
    options: FreeGraphBoxLayoutOptions,
): FreeGraphBoxLayoutResult {
    const minimumX = Math.min(...states.map((state) => state.x - state.width / 2));
    const maximumX = Math.max(...states.map((state) => state.x + state.width / 2));
    const minimumY = Math.min(...states.map((state) => state.y - state.height / 2));
    const maximumY = Math.max(...states.map((state) => state.y + state.height / 2));
    const positionsById = new Map<string, FreeGraphBoxLayoutPosition>();

    states.forEach((state) => {
        positionsById.set(state.id, {
            x: state.x - state.width / 2 - minimumX + options.paddingX,
            y: state.y - state.height / 2 - minimumY + options.paddingY,
        });
    });

    return {
        width: maximumX - minimumX + options.paddingX * 2,
        height: maximumY - minimumY + options.paddingY * 2,
        positionsById,
    };
}

/**
 * Build a deterministic free layout for differently sized boxes and their relationships.
 *
 * @param items - Boxes to place.
 * @param links - Weighted graph relationships between boxes.
 * @param options - Layout tuning options.
 * @returns Normalized top-left positions and parent dimensions.
 *
 * @private function of AgentsGraph
 */
export function buildFreeGraphBoxLayout(
    items: ReadonlyArray<FreeGraphBoxLayoutItem>,
    links: ReadonlyArray<FreeGraphBoxLayoutLink>,
    options: FreeGraphBoxLayoutOptions,
): FreeGraphBoxLayoutResult {
    if (items.length === 0) {
        return {
            width: options.paddingX * 2,
            height: options.paddingY * 2,
            positionsById: new Map(),
        };
    }

    const orderedItems = sortLayoutItemsByImportance(items, links, options.centerItemId);
    const states = createInitialLayoutState(orderedItems, options);
    const stateById = new Map(states.map((state) => [state.id, state]));
    const iterationCount = options.iterationCount ?? DEFAULT_LAYOUT_ITERATION_COUNT;

    for (let iterationIndex = 0; iterationIndex < iterationCount; iterationIndex += 1) {
        relaxRelationshipLinks(stateById, links, options);
        separateOverlappingBoxes(states, options);
        applyInitialPositionPull(states, options.centerPullStrength);
    }

    return normalizeLayoutState(states, options);
}
