import type { OfficePoint } from './buildOfficeLayout';

/**
 * Screen-space scene metrics derived from the world layout.
 *
 * @private function of <OfficeScene/> and <AgentsOffice/>
 */
export type OfficeSceneMetrics = {
    sceneWidth: number;
    sceneHeight: number;
    originX: number;
    originY: number;
};

/**
 * Geometry used by one isometric block primitive.
 */
type OfficeSceneBlockGeometry = {
    x: number;
    y: number;
    width: number;
    depth: number;
    elevation: number;
};

/**
 * Paint configuration for one reusable isometric block primitive.
 */
type OfficeSceneBlockPaint = {
    topFill: string;
    frontFill: string;
    rightFill: string;
    topStroke: string;
    faceStroke: string;
    topStrokeWidth: number;
    faceStrokeWidth: number;
    topPatternId?: string;
    topPatternOpacity?: number;
};

/**
 * Horizontal scale factor used by the isometric projection.
 */
const ISO_X_SCALE = 1;

/**
 * Vertical scale factor used by the isometric projection.
 */
const ISO_Y_SCALE = 0.56;

/**
 * Height used for desks and agent figures in projected space.
 */
const OFFICE_OBJECT_HEIGHT = 22;

/**
 * Rendered height of room side walls.
 */
const ROOM_WALL_HEIGHT = 22;

/**
 * Height used for room furniture and accessories.
 */
const ROOM_PROP_HEIGHT = 14;

/**
 * Height used when rendering desk monitors.
 */
const DESK_MONITOR_HEIGHT = OFFICE_OBJECT_HEIGHT + 9;

/**
 * Height used for floating activity bubbles above agents.
 */
const AGENT_BUBBLE_HEIGHT = OFFICE_OBJECT_HEIGHT + 42;

/**
 * Outfit colors for deterministic per-agent character variation.
 */
const AGENT_OUTFIT_PALETTE = ['#0f172a', '#0f766e', '#7c2d12', '#6d28d9', '#be123c', '#1e3a8a'];

/**
 * Skin-tone palette used for deterministic per-agent avatars.
 */
const AGENT_SKIN_PALETTE = ['#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309'];

/**
 * Hair-color palette used for deterministic per-agent avatars.
 */
const AGENT_HAIR_PALETTE = ['#0f172a', '#1f2937', '#451a03', '#78350f', '#475569'];

/**
 * Projects one world-space point into screen-space isometric coordinates.
 *
 * @param point - World-space point.
 * @param elevation - Projected vertical offset.
 * @param metrics - Scene projection metrics.
 * @returns Projected screen-space point.
 */
function projectPoint(point: OfficePoint, elevation: number, metrics: OfficeSceneMetrics): OfficePoint {
    return {
        x: metrics.originX + (point.x - point.y) * ISO_X_SCALE,
        y: metrics.originY + (point.x + point.y) * ISO_Y_SCALE - elevation,
    };
}

/**
 * Renders one reusable isometric block with optional top-surface texture.
 *
 * @param key - Stable React key for the block.
 * @param geometry - Block geometry in world coordinates.
 * @param metrics - Scene projection metrics.
 * @param paint - Paint configuration for all visible faces.
 * @returns Block SVG group.
 */
function renderIsometricBlock(
    key: string,
    geometry: OfficeSceneBlockGeometry,
    metrics: OfficeSceneMetrics,
    paint: OfficeSceneBlockPaint,
) {
    const topFace = projectTopFace(geometry.x, geometry.y, geometry.width, geometry.depth, geometry.elevation, metrics);
    const frontFace = projectFrontFace(
        geometry.x,
        geometry.y,
        geometry.width,
        geometry.depth,
        geometry.elevation,
        metrics,
    );
    const rightFace = projectRightFace(
        geometry.x,
        geometry.y,
        geometry.width,
        geometry.depth,
        geometry.elevation,
        metrics,
    );

    return (
        <g key={key}>
            <polygon
                points={topFace}
                fill={paint.topFill}
                stroke={paint.topStroke}
                strokeWidth={paint.topStrokeWidth}
            />
            {paint.topPatternId && (
                <polygon
                    points={topFace}
                    fill={`url(#${paint.topPatternId})`}
                    opacity={paint.topPatternOpacity === undefined ? 0.5 : paint.topPatternOpacity}
                />
            )}
            <polygon
                points={frontFace}
                fill={paint.frontFill}
                stroke={paint.faceStroke}
                strokeWidth={paint.faceStrokeWidth}
            />
            <polygon
                points={rightFace}
                fill={paint.rightFill}
                stroke={paint.faceStroke}
                strokeWidth={paint.faceStrokeWidth}
            />
        </g>
    );
}

/**
 * Projects the top face of one isometric block.
 *
 * @param x - World X coordinate.
 * @param y - World Y coordinate.
 * @param width - Block width.
 * @param depth - Block depth.
 * @param elevation - Block elevation.
 * @param metrics - Scene projection metrics.
 * @returns Polygon points string.
 */
function projectTopFace(
    x: number,
    y: number,
    width: number,
    depth: number,
    elevation: number,
    metrics: OfficeSceneMetrics,
): string {
    const topLeft = projectPoint({ x, y }, elevation, metrics);
    const topRight = projectPoint({ x: x + width, y }, elevation, metrics);
    const bottomRight = projectPoint({ x: x + width, y: y + depth }, elevation, metrics);
    const bottomLeft = projectPoint({ x, y: y + depth }, elevation, metrics);

    return `${topLeft.x},${topLeft.y} ${topRight.x},${topRight.y} ${bottomRight.x},${bottomRight.y} ${bottomLeft.x},${bottomLeft.y}`;
}

/**
 * Projects the front face of one isometric block.
 *
 * @param x - World X coordinate.
 * @param y - World Y coordinate.
 * @param width - Block width.
 * @param depth - Block depth.
 * @param elevation - Block elevation.
 * @param metrics - Scene projection metrics.
 * @returns Polygon points string.
 */
function projectFrontFace(
    x: number,
    y: number,
    width: number,
    depth: number,
    elevation: number,
    metrics: OfficeSceneMetrics,
): string {
    const bottomLeft = projectPoint({ x, y: y + depth }, 0, metrics);
    const bottomRight = projectPoint({ x: x + width, y: y + depth }, 0, metrics);
    const topRight = projectPoint({ x: x + width, y: y + depth }, elevation, metrics);
    const topLeft = projectPoint({ x, y: y + depth }, elevation, metrics);

    return `${bottomLeft.x},${bottomLeft.y} ${bottomRight.x},${bottomRight.y} ${topRight.x},${topRight.y} ${topLeft.x},${topLeft.y}`;
}

/**
 * Projects the right face of one isometric block.
 *
 * @param x - World X coordinate.
 * @param y - World Y coordinate.
 * @param width - Block width.
 * @param depth - Block depth.
 * @param elevation - Block elevation.
 * @param metrics - Scene projection metrics.
 * @returns Polygon points string.
 */
function projectRightFace(
    x: number,
    y: number,
    width: number,
    depth: number,
    elevation: number,
    metrics: OfficeSceneMetrics,
): string {
    const bottomRight = projectPoint({ x: x + width, y }, 0, metrics);
    const bottomFarRight = projectPoint({ x: x + width, y: y + depth }, 0, metrics);
    const topFarRight = projectPoint({ x: x + width, y: y + depth }, elevation, metrics);
    const topRight = projectPoint({ x: x + width, y }, elevation, metrics);

    return `${bottomRight.x},${bottomRight.y} ${bottomFarRight.x},${bottomFarRight.y} ${topFarRight.x},${topFarRight.y} ${topRight.x},${topRight.y}`;
}

/**
 * Converts a HEX color into an RGBA string with the provided alpha value.
 *
 * @param hexColor - Source hex color string.
 * @param alpha - Target alpha component.
 * @returns RGBA CSS color string.
 */
function hexToRgba(hexColor: string, alpha: number): string {
    const normalized = hexColor.replace('#', '').trim();
    const longHex =
        normalized.length === 3
            ? normalized
                  .split('')
                  .map((character) => `${character}${character}`)
                  .join('')
            : normalized.padEnd(6, '0').slice(0, 6);

    const red = Number.parseInt(longHex.slice(0, 2), 16);
    const green = Number.parseInt(longHex.slice(2, 4), 16);
    const blue = Number.parseInt(longHex.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/**
 * Picks a deterministic color from a palette using one numeric seed.
 *
 * @param seed - Stable numeric seed.
 * @param palette - Candidate color palette.
 * @returns Deterministic palette entry.
 */
function pickColorFromSeed(seed: number, palette: ReadonlyArray<string>): string {
    if (palette.length === 0) {
        return '#0f172a';
    }

    const normalizedSeed = Math.abs(Math.floor(seed));
    return palette[normalizedSeed % palette.length] || palette[0] || '#0f172a';
}

/**
 * Interpolates two projected points using linear progress.
 *
 * @param start - Start point.
 * @param end - End point.
 * @param progress - Value from 0..1.
 * @returns Interpolated point.
 */
function interpolatePoint(start: OfficePoint, end: OfficePoint, progress: number): OfficePoint {
    return {
        x: start.x + (end.x - start.x) * progress,
        y: start.y + (end.y - start.y) * progress,
    };
}

/**
 * Truncates short labels used inside the SVG scene.
 *
 * @param value - Text to truncate.
 * @param maxLength - Maximum text length.
 * @returns Truncated label text.
 */
function truncateText(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
        return value;
    }

    return `${value.slice(0, Math.max(1, maxLength - 3))}...`;
}

/**
 * Shared geometry, constants, and rendering helpers for the office scene.
 *
 * @private function of <OfficeScene/> and <AgentsOffice/>
 */
export const OfficeSceneGeometry = {
    ISO_X_SCALE,
    ISO_Y_SCALE,
    OFFICE_OBJECT_HEIGHT,
    ROOM_WALL_HEIGHT,
    ROOM_PROP_HEIGHT,
    DESK_MONITOR_HEIGHT,
    AGENT_BUBBLE_HEIGHT,
    AGENT_OUTFIT_PALETTE,
    AGENT_SKIN_PALETTE,
    AGENT_HAIR_PALETTE,
    projectPoint,
    renderIsometricBlock,
    projectTopFace,
    hexToRgba,
    pickColorFromSeed,
    interpolatePoint,
    truncateText,
} as const;
