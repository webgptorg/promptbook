/* eslint-disable no-magic-numbers */

// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * One 3D point used by the shared avatar projection helpers.
 *
 * @private helper of the 3D avatar visuals
 */
export type Point3D = {
    readonly x: number;
    readonly y: number;
    readonly z: number;
};

/**
 * One projected 2D point derived from scene-space 3D coordinates.
 *
 * @private helper of the 3D avatar visuals
 */
export type ProjectedPoint = {
    readonly x: number;
    readonly y: number;
    readonly z: number;
};

/**
 * Default camera distance ratio shared by the proper-3D avatar visuals.
 *
 * @private helper of the 3D avatar visuals
 */
export const DEFAULT_3D_CAMERA_DISTANCE_RATIO = 1.4;

/**
 * Clamps one number into the provided range.
 *
 * @param value Input value.
 * @param minimumValue Inclusive lower bound.
 * @param maximumValue Inclusive upper bound.
 * @returns Clamped value.
 *
 * @private helper of the 3D avatar visuals
 */
export function clampNumber(value: number, minimumValue: number, maximumValue: number): number {
    return Math.min(maximumValue, Math.max(minimumValue, value));
}

/**
 * Rotates one point around the local Y axis.
 *
 * @param point Source point.
 * @param angle Rotation angle in radians.
 * @returns Rotated point.
 *
 * @private helper of the 3D avatar visuals
 */
export function rotatePointAroundY(point: Point3D, angle: number): Point3D {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    return {
        x: point.x * cosine + point.z * sine,
        y: point.y,
        z: -point.x * sine + point.z * cosine,
    };
}

/**
 * Rotates one point around the local X axis.
 *
 * @param point Source point.
 * @param angle Rotation angle in radians.
 * @returns Rotated point.
 *
 * @private helper of the 3D avatar visuals
 */
export function rotatePointAroundX(point: Point3D, angle: number): Point3D {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    return {
        x: point.x,
        y: point.y * cosine - point.z * sine,
        z: point.y * sine + point.z * cosine,
    };
}

/**
 * Applies the local rotations and translation to one scene point.
 *
 * @param localPoint Point in local object space.
 * @param center Object center in scene space.
 * @param rotationX Object pitch in radians.
 * @param rotationY Object yaw in radians.
 * @returns Transformed scene-space point.
 *
 * @private helper of the 3D avatar visuals
 */
export function transformScenePoint(localPoint: Point3D, center: Point3D, rotationX: number, rotationY: number): Point3D {
    const yawedPoint = rotatePointAroundY(localPoint, rotationY);
    const pitchedPoint = rotatePointAroundX(yawedPoint, rotationX);

    return {
        x: center.x + pitchedPoint.x,
        y: center.y + pitchedPoint.y,
        z: center.z + pitchedPoint.z,
    };
}

/**
 * Projects one scene point into canvas coordinates.
 *
 * @param point Scene-space point.
 * @param size Canvas size in CSS pixels.
 * @param sceneCenterX Horizontal scene center.
 * @param sceneCenterY Vertical scene center.
 * @param cameraDistanceRatio Optional camera distance ratio.
 * @returns Projected point.
 *
 * @private helper of the 3D avatar visuals
 */
export function projectScenePoint(
    point: Point3D,
    size: number,
    sceneCenterX: number,
    sceneCenterY: number,
    cameraDistanceRatio: number = DEFAULT_3D_CAMERA_DISTANCE_RATIO,
): ProjectedPoint {
    const cameraDistance = size * cameraDistanceRatio;
    const perspectiveScale = cameraDistance / Math.max(cameraDistance - point.z, cameraDistance * 0.35);

    return {
        x: sceneCenterX + point.x * perspectiveScale,
        y: sceneCenterY + point.y * perspectiveScale,
        z: point.z,
    };
}

/**
 * Interpolates between two projected points.
 *
 * @param startPoint Start point.
 * @param endPoint End point.
 * @param ratio Interpolation ratio in the range `[0, 1]`.
 * @returns Interpolated projected point.
 *
 * @private helper of the 3D avatar visuals
 */
export function interpolateProjectedPoint(startPoint: ProjectedPoint, endPoint: ProjectedPoint, ratio: number): ProjectedPoint {
    return {
        x: startPoint.x + (endPoint.x - startPoint.x) * ratio,
        y: startPoint.y + (endPoint.y - startPoint.y) * ratio,
        z: startPoint.z + (endPoint.z - startPoint.z) * ratio,
    };
}

/**
 * Subtracts one 3D point from another.
 *
 * @param leftPoint Left point.
 * @param rightPoint Right point.
 * @returns Difference vector.
 *
 * @private helper of the 3D avatar visuals
 */
export function subtractPoint3D(leftPoint: Point3D, rightPoint: Point3D): Point3D {
    return {
        x: leftPoint.x - rightPoint.x,
        y: leftPoint.y - rightPoint.y,
        z: leftPoint.z - rightPoint.z,
    };
}

/**
 * Computes the 3D cross product of two vectors.
 *
 * @param leftVector Left vector.
 * @param rightVector Right vector.
 * @returns Cross product.
 *
 * @private helper of the 3D avatar visuals
 */
export function crossProduct3D(leftVector: Point3D, rightVector: Point3D): Point3D {
    return {
        x: leftVector.y * rightVector.z - leftVector.z * rightVector.y,
        y: leftVector.z * rightVector.x - leftVector.x * rightVector.z,
        z: leftVector.x * rightVector.y - leftVector.y * rightVector.x,
    };
}

/**
 * Computes the 3D dot product of two vectors.
 *
 * @param leftVector Left vector.
 * @param rightVector Right vector.
 * @returns Dot product.
 *
 * @private helper of the 3D avatar visuals
 */
export function dotProduct3D(leftVector: Point3D, rightVector: Point3D): number {
    return leftVector.x * rightVector.x + leftVector.y * rightVector.y + leftVector.z * rightVector.z;
}

/**
 * Normalizes one 3D vector while keeping zero vectors stable.
 *
 * @param vector Source vector.
 * @returns Normalized vector.
 *
 * @private helper of the 3D avatar visuals
 */
export function normalizeVector3(vector: Point3D): Point3D {
    const length = Math.hypot(vector.x, vector.y, vector.z);

    if (length === 0) {
        return vector;
    }

    return {
        x: vector.x / length,
        y: vector.y / length,
        z: vector.z / length,
    };
}

/**
 * Measures the perimeter of one projected quad.
 *
 * @param corners Quad corners.
 * @returns Perimeter length.
 *
 * @private helper of the 3D avatar visuals
 */
export function getProjectedQuadPerimeter(
    corners: readonly [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint],
): number {
    let perimeter = 0;

    for (let cornerIndex = 0; cornerIndex < corners.length; cornerIndex++) {
        const currentCorner = corners[cornerIndex]!;
        const nextCorner = corners[(cornerIndex + 1) % corners.length]!;
        perimeter += Math.hypot(nextCorner.x - currentCorner.x, nextCorner.y - currentCorner.y);
    }

    return perimeter;
}
