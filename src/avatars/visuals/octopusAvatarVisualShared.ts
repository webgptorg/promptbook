/* eslint-disable no-magic-numbers */

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
    } = options;
    const baseY = centerY + bodyRadius * 0.74;

    return Array.from({ length: tentacleCount }, (_, tentacleIndex) => {
        const tentacleRandom = createRandom(`${saltPrefix}-tentacle-${tentacleIndex}`);
        const spreadProgress = tentacleCount === 1 ? 0.5 : tentacleIndex / (tentacleCount - 1);
        const centeredProgress = spreadProgress - 0.5;
        const temporalSway =
            Math.sin(timeMs / (720 + tentacleIndex * 34) + shapePhase + tentacleRandom() * Math.PI * 2) *
            size *
            (0.014 + tentacleRandom() * 0.015);
        const flowLength = size * (0.24 + tentacleRandom() * 0.18);
        const curlDirection = centeredProgress === 0 ? (tentacleRandom() < 0.5 ? -1 : 1) : Math.sign(centeredProgress);
        const lateralReach = centeredProgress * size * (0.1 + tentacleRandom() * 0.1) + temporalSway;
        const tipReach = curlDirection * size * (0.025 + tentacleRandom() * 0.07);
        const startPoint = {
            x: centerX + centeredProgress * bodyRadius * horizontalStretch * 1.52,
            y: baseY + Math.abs(centeredProgress) * size * 0.012 + tentacleRandom() * size * 0.01,
        };
        const controlPointOne = {
            x: startPoint.x + centeredProgress * size * 0.045 + temporalSway * 0.4,
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
        const baseWidth = size * (0.038 + tentacleRandom() * 0.02) * (1 - Math.abs(centeredProgress) * 0.18);
        const tipWidth = baseWidth * (0.18 + tentacleRandom() * 0.2);

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
