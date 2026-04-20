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
