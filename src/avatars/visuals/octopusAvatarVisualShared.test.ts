import { describe, expect, it } from '@jest/globals';
import { createSeededRandom } from '../avatarRenderingUtils';
import { createOrganicOctopusBodyPoints, createOrganicOctopusTentacleShapes } from './octopusAvatarVisualShared';

/**
 * Stable canvas size used for Octopus3 tentacle-root regression coverage.
 */
const TEST_AVATAR_SIZE = 192;

/**
 * Stable animation timestamp used for Octopus3 tentacle-root regression coverage.
 */
const TEST_TIME_MS = 840;

/**
 * Number of deterministic Octopus3 seeds covered by the tentacle-root regression.
 */
const TEST_SAMPLE_COUNT = 48;

describe('createOrganicOctopusTentacleShapes', () => {
    it('keeps Octopus3 tentacle roots inside the mantle when body anchors are provided', () => {
        const failingTentacleRoots: Array<{
            sampleIndex: number;
            tentacleIndex: number;
            startPoint: { x: number; y: number };
        }> = [];

        for (let sampleIndex = 0; sampleIndex < TEST_SAMPLE_COUNT; sampleIndex++) {
            const { bodyPoints, tentacleShapes } = buildOctopus3GeometrySample(sampleIndex);

            tentacleShapes.forEach((tentacleShape, tentacleIndex) => {
                if (!isPointInsidePolygon(tentacleShape.startPoint, bodyPoints)) {
                    failingTentacleRoots.push({
                        sampleIndex,
                        tentacleIndex,
                        startPoint: tentacleShape.startPoint,
                    });
                }
            });
        }

        expect(failingTentacleRoots).toEqual([]);
    });

    it('applies Octopus3 tentacle variation scales without changing the anchored-root contract', () => {
        const defaultGeometry = buildOctopus3GeometrySample(7);
        const expandedGeometry = buildOctopus3GeometrySample(7, {
            flowLengthScale: 1.28,
            lateralReachScale: 1.34,
            rootSpreadScale: 1.18,
            swayScale: 1.16,
        });

        expect(resolveAverageTentacleReach(expandedGeometry.tentacleShapes)).toBeGreaterThan(
            resolveAverageTentacleReach(defaultGeometry.tentacleShapes),
        );
        expect(resolveTentacleRootSpan(expandedGeometry.tentacleShapes)).toBeGreaterThan(
            resolveTentacleRootSpan(defaultGeometry.tentacleShapes),
        );
        expandedGeometry.tentacleShapes.forEach((tentacleShape) => {
            expect(isPointInsidePolygon(tentacleShape.startPoint, expandedGeometry.bodyPoints)).toBe(true);
        });
    });
});

/**
 * Builds one deterministic Octopus3 geometry sample using the same ranges as the production renderer.
 *
 * @param sampleIndex Deterministic sample index.
 * @param tentacleVariation Optional tentacle-variation overrides.
 * @returns Body and tentacle geometry for one seeded Octopus3 avatar.
 */
function buildOctopus3GeometrySample(
    sampleIndex: number,
    tentacleVariation?: {
        readonly flowLengthScale?: number;
        readonly lateralReachScale?: number;
        readonly rootSpreadScale?: number;
        readonly swayScale?: number;
    },
): {
    readonly bodyPoints: ReadonlyArray<{ readonly x: number; readonly y: number }>;
    readonly tentacleShapes: ReturnType<typeof createOrganicOctopusTentacleShapes>;
} {
    const seedBase = `octopus3-regression-${sampleIndex}`;
    const staticRandom = createSeededRandom(`${seedBase}|octopus3-static`);
    const centerX = TEST_AVATAR_SIZE * (0.5 + (staticRandom() - 0.5) * 0.02);
    const centerY = TEST_AVATAR_SIZE * (0.41 + staticRandom() * 0.05);
    const bodyRadius = TEST_AVATAR_SIZE * (0.2 + staticRandom() * 0.045);
    const horizontalStretch = 1.08 + staticRandom() * 0.22;
    const verticalStretch = 0.9 + staticRandom() * 0.12;
    const mantleLift = TEST_AVATAR_SIZE * (0.105 + staticRandom() * 0.03);
    const lowerDrop = TEST_AVATAR_SIZE * (0.028 + staticRandom() * 0.022);
    const tentacleDepth = TEST_AVATAR_SIZE * (0.022 + staticRandom() * 0.018);
    const wobbleAmplitude = TEST_AVATAR_SIZE * (0.01 + staticRandom() * 0.01);
    const lobeCount = 5 + Math.floor(staticRandom() * 3);
    const shapePhase = staticRandom() * Math.PI * 2;
    const tentacleCount = 8 + Math.floor(staticRandom() * 5);
    const createRandom = (salt: string) => createSeededRandom(`${seedBase}|${salt}`);
    const bodyPoints = createOrganicOctopusBodyPoints({
        centerX,
        centerY,
        bodyRadius,
        horizontalStretch,
        verticalStretch,
        mantleLift,
        lowerDrop,
        tentacleDepth,
        wobbleAmplitude,
        lobeCount,
        shapePhase,
        timeMs: TEST_TIME_MS,
        pointCount: 40,
    });
    const tentacleShapes = createOrganicOctopusTentacleShapes({
        size: TEST_AVATAR_SIZE,
        centerX,
        centerY,
        bodyRadius,
        horizontalStretch,
        tentacleCount,
        shapePhase,
        createRandom,
        timeMs: TEST_TIME_MS,
        saltPrefix: 'octopus3',
        bodyPoints,
        variation: tentacleVariation,
    });

    return { bodyPoints, tentacleShapes };
}

/**
 * Resolves the average tentacle centerline reach for one geometry sample.
 *
 * @param tentacleShapes Tentacle geometry sample.
 * @returns Average start-to-tip distance.
 */
function resolveAverageTentacleReach(tentacleShapes: ReturnType<typeof createOrganicOctopusTentacleShapes>): number {
    const totalReach = tentacleShapes.reduce((sum, tentacleShape) => {
        return (
            sum +
            Math.hypot(
                tentacleShape.endPoint.x - tentacleShape.startPoint.x,
                tentacleShape.endPoint.y - tentacleShape.startPoint.y,
            )
        );
    }, 0);

    return totalReach / tentacleShapes.length;
}

/**
 * Resolves the horizontal span between the outermost tentacle roots.
 *
 * @param tentacleShapes Tentacle geometry sample.
 * @returns Root span in CSS pixels.
 */
function resolveTentacleRootSpan(tentacleShapes: ReturnType<typeof createOrganicOctopusTentacleShapes>): number {
    const tentacleRootXs = tentacleShapes.map((tentacleShape) => tentacleShape.startPoint.x);

    return Math.max(...tentacleRootXs) - Math.min(...tentacleRootXs);
}

/**
 * Checks whether one point lies inside a polygon using the ray-casting algorithm.
 *
 * @param point Candidate point.
 * @param polygon Closed polygon represented by ordered points.
 * @returns `true` when the point lies inside the polygon.
 */
function isPointInsidePolygon(
    point: { readonly x: number; readonly y: number },
    polygon: ReadonlyArray<{ readonly x: number; readonly y: number }>,
): boolean {
    let isInside = false;

    for (
        let pointIndex = 0, previousPointIndex = polygon.length - 1;
        pointIndex < polygon.length;
        previousPointIndex = pointIndex++
    ) {
        const currentPoint = polygon[pointIndex]!;
        const previousPoint = polygon[previousPointIndex]!;
        const doesRayIntersectSegment =
            currentPoint.y > point.y !== previousPoint.y > point.y &&
            point.x <
                ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
                    (previousPoint.y - currentPoint.y || Number.EPSILON) +
                    currentPoint.x;

        if (doesRayIntersectSegment) {
            isInside = !isInside;
        }
    }

    return isInside;
}
