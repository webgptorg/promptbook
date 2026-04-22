/* eslint-disable no-magic-numbers */

import type { AvatarInteractionState } from '../types/AvatarVisualDefinition';

// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * One 2D point used by the shared organic octopus geometry helpers.
 *
 * @private helper of octopus avatar visuals
 */
type Point = {
    readonly x: number;
    readonly y: number;
};

/**
 * Shape parameters for the smooth octopus silhouette generator.
 *
 * @private helper of octopus avatar visuals
 */
type CreateOrganicOctopusBodyPointsOptions = {
    readonly centerX: number;
    readonly centerY: number;
    readonly bodyRadius: number;
    readonly horizontalStretch: number;
    readonly verticalStretch: number;
    readonly mantleLift: number;
    readonly lowerDrop: number;
    readonly tentacleDepth: number;
    readonly wobbleAmplitude: number;
    readonly lobeCount: number;
    readonly shapePhase: number;
    readonly timeMs: number;
    readonly pointCount?: number;
};

/**
 * One deterministic ribbon tentacle attached to an organic octopus mantle.
 *
 * @private shared geometry helper of `octopus3AvatarVisual` and `asciiOctopusAvatarVisual`
 */
export type OrganicTentacleShape = {
    readonly startPoint: Point;
    readonly controlPointOne: Point;
    readonly controlPointTwo: Point;
    readonly endPoint: Point;
    readonly baseWidth: number;
    readonly tipWidth: number;
    readonly colorBias: number;
    readonly highlightBias: number;
    readonly sampleCount: number;
};

/**
 * Options for generating deterministic organic octopus tentacles.
 *
 * @private shared geometry helper of `octopus3AvatarVisual` and `asciiOctopusAvatarVisual`
 */
type CreateOrganicOctopusTentacleShapesOptions = {
    readonly size: number;
    readonly centerX: number;
    readonly centerY: number;
    readonly bodyRadius: number;
    readonly horizontalStretch: number;
    readonly tentacleCount: number;
    readonly shapePhase: number;
    readonly createRandom: (salt: string) => () => number;
    readonly timeMs: number;
    readonly saltPrefix: string;
    readonly bodyPoints?: ReadonlyArray<Point>;
    readonly variation?: OrganicTentacleVariationOptions;
};

/**
 * Opt-in shape multipliers that let one visual broaden or tighten the shared tentacle generator.
 *
 * @private shared geometry helper of `octopus3AvatarVisual` and `asciiOctopusAvatarVisual`
 */
type OrganicTentacleVariationOptions = {
    readonly flowLengthScale?: number;
    readonly lateralReachScale?: number;
    readonly tipReachScale?: number;
    readonly baseWidthScale?: number;
    readonly tipWidthScale?: number;
    readonly rootSpreadScale?: number;
    readonly startYOffsetScale?: number;
    readonly swayScale?: number;
};

/**
 * One sampled ribbon point on an organic octopus tentacle.
 *
 * @private shared geometry helper of `octopus3AvatarVisual` and `asciiOctopusAvatarVisual`
 */
export type OrganicTentacleRibbonPoint = {
    readonly x: number;
    readonly y: number;
    readonly normalX: number;
    readonly normalY: number;
    readonly width: number;
    readonly progress: number;
};

/**
 * One resolved eye-motion sample shared by the octopus-family renderers.
 *
 * @private shared geometry helper of octopus avatar visuals
 */
export type OrganicEyeMotion = {
    readonly pupilOffsetX: number;
    readonly pupilOffsetY: number;
};

/**
 * Minimal interaction subset needed to steer octopus-eye pupils.
 *
 * @private shared geometry helper of octopus avatar visuals
 */
type OrganicEyeInteraction = Pick<AvatarInteractionState, 'gazeX' | 'gazeY' | 'intensity'>;

/**
 * Builds a smoothly morphing octopus-like silhouette from deterministic parameters.
 *
 * @param options Shape construction options.
 * @returns Closed-loop body points.
 *
 * @private shared geometry helper of `octopus2AvatarVisual` and `octopus3AvatarVisual`
 */
export function createOrganicOctopusBodyPoints(options: CreateOrganicOctopusBodyPointsOptions): Array<Point> {
    const {
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
        timeMs,
        pointCount = 36,
    } = options;

    return Array.from({ length: pointCount }, (_, pointIndex) => {
        const progress = pointIndex / pointCount;
        const angle = -Math.PI / 2 + progress * Math.PI * 2;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const upperFactor = Math.max(0, -sine);
        const lowerFactor = Math.max(0, sine);
        const lobeEnvelope = Math.pow(lowerFactor, 1.35);
        const tentacleWave =
            Math.max(0, Math.cos(angle * lobeCount + shapePhase + timeMs / 780)) * tentacleDepth * lobeEnvelope;
        const surfaceWave =
            Math.sin(angle * 3 + shapePhase + timeMs / 1200) * 0.62 +
            Math.sin(angle * 5 - shapePhase * 0.7 - timeMs / 910) * 0.38;
        const breathingWave = Math.sin(timeMs / 960 + shapePhase + angle * 0.45) * wobbleAmplitude;
        const radius =
            bodyRadius *
                (1 + upperFactor * 0.12 + lowerFactor * 0.08 + surfaceWave * 0.05) +
            tentacleWave +
            breathingWave;

        return {
            x:
                centerX +
                cosine * radius * horizontalStretch +
                Math.sin(angle * 2 + shapePhase) * lobeEnvelope * wobbleAmplitude * 0.7,
            y:
                centerY +
                sine * radius * verticalStretch -
                upperFactor * mantleLift +
                lowerFactor * lowerDrop +
                tentacleWave * 0.28,
        };
    });
}

/**
 * Traces a smooth closed path through the provided points.
 *
 * @param context Canvas 2D context.
 * @param points Closed-loop points.
 *
 * @private shared geometry helper of `octopus2AvatarVisual` and `octopus3AvatarVisual`
 */
export function traceSmoothClosedPath(
    context: CanvasRenderingContext2D,
    points: ReadonlyArray<Point>,
): void {
    const lastPoint = points[points.length - 1]!;
    const firstPoint = points[0]!;
    const initialMidpoint = {
        x: (lastPoint.x + firstPoint.x) / 2,
        y: (lastPoint.y + firstPoint.y) / 2,
    };

    context.beginPath();
    context.moveTo(initialMidpoint.x, initialMidpoint.y);

    for (let pointIndex = 0; pointIndex < points.length; pointIndex++) {
        const point = points[pointIndex]!;
        const nextPoint = points[(pointIndex + 1) % points.length]!;
        const midpoint = {
            x: (point.x + nextPoint.x) / 2,
            y: (point.y + nextPoint.y) / 2,
        };

        context.quadraticCurveTo(point.x, point.y, midpoint.x, midpoint.y);
    }

    context.closePath();
}

/**
 * Creates deterministic ribbon tentacles for the organic octopus visuals.
 *
 * @param options Tentacle construction options.
 * @returns Tentacle descriptors.
 *
 * @private shared geometry helper of `octopus3AvatarVisual` and `asciiOctopusAvatarVisual`
 */
export function createOrganicOctopusTentacleShapes(
    options: CreateOrganicOctopusTentacleShapesOptions,
): Array<OrganicTentacleShape> {
    const {
        size,
        centerX,
        centerY,
        bodyRadius,
        horizontalStretch,
        tentacleCount,
        shapePhase,
        createRandom,
        timeMs,
        saltPrefix,
        bodyPoints,
        variation,
    } = options;
    const baseY = centerY + bodyRadius * 0.74;
    const lowerBodyAnchorPoints = bodyPoints ? resolveTentacleBodyAnchorPoints(bodyPoints, centerY + bodyRadius * 0.04) : null;
    const flowLengthScale = variation?.flowLengthScale ?? 1;
    const lateralReachScale = variation?.lateralReachScale ?? 1;
    const tipReachScale = variation?.tipReachScale ?? 1;
    const baseWidthScale = variation?.baseWidthScale ?? 1;
    const tipWidthScale = variation?.tipWidthScale ?? 1;
    const rootSpreadScale = variation?.rootSpreadScale ?? 1;
    const startYOffsetScale = variation?.startYOffsetScale ?? 1;
    const swayScale = variation?.swayScale ?? 1;

    return Array.from({ length: tentacleCount }, (_, tentacleIndex) => {
        const tentacleRandom = createRandom(`${saltPrefix}-tentacle-${tentacleIndex}`);
        const spreadProgress = tentacleCount === 1 ? 0.5 : tentacleIndex / (tentacleCount - 1);
        const centeredProgress = spreadProgress - 0.5;
        const spreadCenteredProgress = centeredProgress * rootSpreadScale;
        const spreadAnchorProgress = Math.min(1, Math.max(0, 0.5 + spreadCenteredProgress));
        const temporalSway =
            Math.sin(timeMs / (720 + tentacleIndex * 34) + shapePhase + tentacleRandom() * Math.PI * 2) *
            size *
            (0.014 + tentacleRandom() * 0.015) *
            swayScale;
        const flowLength = size * (0.24 + tentacleRandom() * 0.18) * flowLengthScale;
        const curlDirection =
            spreadCenteredProgress === 0 ? (tentacleRandom() < 0.5 ? -1 : 1) : Math.sign(spreadCenteredProgress);
        const lateralReach = spreadCenteredProgress * size * (0.1 + tentacleRandom() * 0.1) * lateralReachScale + temporalSway;
        const tipReach = curlDirection * size * (0.025 + tentacleRandom() * 0.07) * tipReachScale;
        const startYOffset =
            (Math.abs(spreadCenteredProgress) * size * 0.012 + tentacleRandom() * size * 0.01) * startYOffsetScale;
        const startPoint =
            lowerBodyAnchorPoints && lowerBodyAnchorPoints.length >= 2
                ? createInsetTentacleStartPoint({
                      bodyPoints: lowerBodyAnchorPoints,
                      anchorProgress: spreadAnchorProgress,
                      centerX,
                      centerY,
                      bodyRadius,
                      centeredProgress: spreadCenteredProgress,
                      startYOffset,
                  })
                : {
                      x: centerX + spreadCenteredProgress * bodyRadius * horizontalStretch * 1.52,
                      y: baseY + startYOffset,
                  };
        const controlPointOne = {
            x: startPoint.x + spreadCenteredProgress * size * 0.045 * lateralReachScale + temporalSway * 0.4,
            y: startPoint.y + flowLength * (0.21 + tentacleRandom() * 0.08),
        };
        const controlPointTwo = {
            x: startPoint.x + lateralReach + tipReach,
            y: startPoint.y + flowLength * (0.62 + tentacleRandom() * 0.12),
        };
        const endPoint = {
            x: startPoint.x + lateralReach + tipReach * 1.2,
            y:
                startPoint.y +
                flowLength * (0.9 + tentacleRandom() * 0.12) +
                Math.cos(timeMs / (840 + tentacleIndex * 41) + shapePhase) * size * (0.008 + tentacleRandom() * 0.01),
        };
        const baseWidth =
            size * (0.038 + tentacleRandom() * 0.02) * (1 - Math.abs(spreadCenteredProgress) * 0.18) * baseWidthScale;
        const tipWidth = baseWidth * Math.min(0.52, (0.18 + tentacleRandom() * 0.2) * tipWidthScale);

        return {
            startPoint,
            controlPointOne,
            controlPointTwo,
            endPoint,
            baseWidth,
            tipWidth,
            colorBias: tentacleRandom(),
            highlightBias: tentacleRandom(),
            sampleCount: 14 + Math.floor(tentacleRandom() * 6),
        };
    });
}

/**
 * Narrows the body contour to lower anchor points that can safely host tentacle roots.
 *
 * @param bodyPoints Generated closed-loop body points.
 * @param lowerBodyThresholdY Minimum Y coordinate considered part of the lower mantle.
 * @returns Body points sorted from left to right across the lower silhouette.
 *
 * @private shared geometry helper of `octopus3AvatarVisual`
 */
function resolveTentacleBodyAnchorPoints(bodyPoints: ReadonlyArray<Point>, lowerBodyThresholdY: number): Array<Point> {
    const lowerBodyPoints = bodyPoints.filter((bodyPoint) => bodyPoint.y >= lowerBodyThresholdY).sort((leftPoint, rightPoint) => leftPoint.x - rightPoint.x);

    if (lowerBodyPoints.length >= 2) {
        return lowerBodyPoints;
    }

    return [...bodyPoints].sort((leftPoint, rightPoint) => leftPoint.x - rightPoint.x);
}

/**
 * Resolves one tentacle root from the provided lower body contour and nudges it inside the mantle.
 *
 * @param options Tentacle anchor options.
 * @returns Tentacle start point safely embedded inside the body silhouette.
 *
 * @private shared geometry helper of `octopus3AvatarVisual`
 */
function createInsetTentacleStartPoint(options: {
    readonly bodyPoints: ReadonlyArray<Point>;
    readonly anchorProgress: number;
    readonly centerX: number;
    readonly centerY: number;
    readonly bodyRadius: number;
    readonly centeredProgress: number;
    readonly startYOffset: number;
}): Point {
    const { bodyPoints, anchorProgress, centerX, centerY, bodyRadius, centeredProgress, startYOffset } = options;
    const clampedAnchorProgress = Math.min(0.94, Math.max(0.06, anchorProgress));
    const bodyAnchorPoint = interpolatePointAlongTentacleAnchors(bodyPoints, clampedAnchorProgress);
    const inwardX = centerX - bodyAnchorPoint.x;
    const inwardY = centerY + bodyRadius * 0.08 - bodyAnchorPoint.y;
    const inwardLength = Math.hypot(inwardX, inwardY) || 1;
    const insetDistance = bodyRadius * (0.12 + Math.abs(centeredProgress) * 0.05) + startYOffset * 0.32;

    return {
        x: bodyAnchorPoint.x + (inwardX / inwardLength) * insetDistance,
        y: bodyAnchorPoint.y + (inwardY / inwardLength) * insetDistance,
    };
}

/**
 * Interpolates one left-to-right anchor point along the prepared lower body contour.
 *
 * @param bodyPoints Lower body contour points sorted from left to right.
 * @param progress Interpolation progress in the range `[0, 1]`.
 * @returns Interpolated anchor point.
 *
 * @private shared geometry helper of `octopus3AvatarVisual`
 */
function interpolatePointAlongTentacleAnchors(bodyPoints: ReadonlyArray<Point>, progress: number): Point {
    if (bodyPoints.length === 1) {
        return bodyPoints[0]!;
    }

    const anchorIndex = progress * (bodyPoints.length - 1);
    const startIndex = Math.floor(anchorIndex);
    const endIndex = Math.min(bodyPoints.length - 1, startIndex + 1);
    const blend = anchorIndex - startIndex;
    const startPoint = bodyPoints[startIndex]!;
    const endPoint = bodyPoints[endIndex]!;

    return {
        x: startPoint.x + (endPoint.x - startPoint.x) * blend,
        y: startPoint.y + (endPoint.y - startPoint.y) * blend,
    };
}

/**
 * Samples the cubic tentacle centerline and offsets normals to build a filled ribbon.
 *
 * @param tentacleShape Deterministic tentacle descriptor.
 * @returns Sampled ribbon points.
 *
 * @private shared geometry helper of `octopus3AvatarVisual` and `asciiOctopusAvatarVisual`
 */
export function sampleOrganicTentacleRibbonPoints(tentacleShape: OrganicTentacleShape): Array<OrganicTentacleRibbonPoint> {
    return Array.from({ length: tentacleShape.sampleCount + 1 }, (_, sampleIndex) => {
        const progress = sampleIndex / tentacleShape.sampleCount;
        const point = getCubicBezierPoint(
            tentacleShape.startPoint,
            tentacleShape.controlPointOne,
            tentacleShape.controlPointTwo,
            tentacleShape.endPoint,
            progress,
        );
        const previousPoint = getCubicBezierPoint(
            tentacleShape.startPoint,
            tentacleShape.controlPointOne,
            tentacleShape.controlPointTwo,
            tentacleShape.endPoint,
            Math.max(0, progress - 0.04),
        );
        const nextPoint = getCubicBezierPoint(
            tentacleShape.startPoint,
            tentacleShape.controlPointOne,
            tentacleShape.controlPointTwo,
            tentacleShape.endPoint,
            Math.min(1, progress + 0.04),
        );
        const tangentX = nextPoint.x - previousPoint.x;
        const tangentY = nextPoint.y - previousPoint.y;
        const tangentLength = Math.hypot(tangentX, tangentY) || 1;
        const width =
            tentacleShape.baseWidth +
            (tentacleShape.tipWidth - tentacleShape.baseWidth) * Math.pow(progress, 1.1);

        return {
            x: point.x,
            y: point.y,
            normalX: -tangentY / tangentLength,
            normalY: tangentX / tangentLength,
            width,
            progress,
        };
    });
}

/**
 * Resolves smooth pupil offsets that blend autonomous idle drift with live viewer tracking.
 *
 * @param options Eye motion options.
 * @returns Resolved pupil offsets.
 *
 * @private shared geometry helper of octopus avatar visuals
 */
export function resolveOrganicEyeMotion(options: {
    readonly radiusX: number;
    readonly radiusY: number;
    readonly timeMs: number;
    readonly phase: number;
    readonly interaction: OrganicEyeInteraction;
    readonly autonomousDriftRatioX?: number;
    readonly autonomousDriftRatioY?: number;
}): OrganicEyeMotion {
    const {
        radiusX,
        radiusY,
        timeMs,
        phase,
        interaction,
        autonomousDriftRatioX = 0.12,
        autonomousDriftRatioY = 0.08,
    } = options;
    const autonomousOffsetX = Math.sin(timeMs / 1280 + phase) * radiusX * autonomousDriftRatioX;
    const autonomousOffsetY = Math.cos(timeMs / 940 + phase) * radiusY * autonomousDriftRatioY;
    const interactionBlend = Math.min(1, interaction.intensity * 0.9);

    return {
        pupilOffsetX:
            autonomousOffsetX * (1 - interactionBlend) +
            interaction.gazeX * radiusX * (0.18 + interactionBlend * 0.18),
        pupilOffsetY:
            autonomousOffsetY * (1 - interactionBlend) +
            interaction.gazeY * radiusY * (0.16 + interactionBlend * 0.16),
    };
}

/**
 * Samples one point on a cubic Bezier curve.
 *
 * @param startPoint Curve start point.
 * @param controlPointOne First control point.
 * @param controlPointTwo Second control point.
 * @param endPoint Curve end point.
 * @param progress Sampling progress in the range `[0, 1]`.
 * @returns Sampled point.
 *
 * @private shared geometry helper of `octopus3AvatarVisual`
 */
export function getCubicBezierPoint(
    startPoint: Point,
    controlPointOne: Point,
    controlPointTwo: Point,
    endPoint: Point,
    progress: number,
): Point {
    const inverseProgress = 1 - progress;

    return {
        x:
            inverseProgress * inverseProgress * inverseProgress * startPoint.x +
            3 * inverseProgress * inverseProgress * progress * controlPointOne.x +
            3 * inverseProgress * progress * progress * controlPointTwo.x +
            progress * progress * progress * endPoint.x,
        y:
            inverseProgress * inverseProgress * inverseProgress * startPoint.y +
            3 * inverseProgress * inverseProgress * progress * controlPointOne.y +
            3 * inverseProgress * progress * progress * controlPointTwo.y +
            progress * progress * progress * endPoint.y,
    };
}
