/* eslint-disable no-magic-numbers */

import { drawAvatarFrame } from '../avatarRenderingUtils';
import type { AvatarPalette, AvatarVisualDefinition } from '../types/AvatarVisualDefinition';
import {
    createMinecraftHeadTextures,
    createMinecraftTorsoTextures,
    type MinecraftCuboidTextures,
    type MinecraftTexture,
} from './minecraftAvatarVisualShared';

/**
 * Camera-space point used by the projected Minecraft cuboid renderer.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
type Point3D = {
    readonly x: number;
    readonly y: number;
    readonly z: number;
};

/**
 * Projected 2D point derived from one 3D model-space position.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
type ProjectedPoint = {
    readonly x: number;
    readonly y: number;
    readonly z: number;
};

/**
 * One textured cuboid placed in the Minecraft 3D 2 scene.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
type MinecraftSceneCuboid = {
    readonly center: Point3D;
    readonly width: number;
    readonly height: number;
    readonly depth: number;
    readonly rotationX: number;
    readonly rotationY: number;
    readonly textures: MinecraftCuboidTextures;
    readonly outlineColor: string;
};

/**
 * One rendered face after visibility culling and depth sorting.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
type VisibleCuboidFace = {
    readonly corners: [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];
    readonly texture: MinecraftTexture;
    readonly averageDepth: number;
    readonly lightIntensity: number;
    readonly outlineColor: string;
};

/**
 * Fixed scene camera distance used for the proper-3D projection.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
const CAMERA_DISTANCE_RATIO = 1.4;

/**
 * Shared light direction used to shade projected cuboid faces.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
const LIGHT_DIRECTION: Point3D = normalizeVector3({
    x: 0.4,
    y: -0.65,
    z: 0.92,
});

/**
 * Minecraft 3D 2 avatar visual.
 *
 * @private built-in avatar visual
 */
export const minecraft2AvatarVisual: AvatarVisualDefinition = {
    id: 'minecraft2',
    title: 'Minecraft 3D 2',
    description: 'Proper 3D Minecraft-style portrait with textured cuboids and pointer-driven head turns.',
    isAnimated: true,
    supportsPointerTracking: true,
    render({ context, size, palette, createRandom, timeMs, interaction }) {
        const spotlightY = size * 0.22;
        const headRandom = createRandom('minecraft2-head');
        const hasHeadband = headRandom() < 0.5;
        const headTextures = createMinecraftHeadTextures(
            createRandom('minecraft2-head-textures'),
            palette,
            hasHeadband,
        );
        const torsoTextures = createMinecraftTorsoTextures(createRandom('minecraft2-body-textures'), palette);
        const bob = Math.sin(timeMs / 880) * size * 0.014;
        const bodyYaw = -0.24 + Math.sin(timeMs / 2300) * 0.06 + interaction.bodyOffsetX * 0.16;
        const bodyPitch = -0.12 + Math.cos(timeMs / 2800) * 0.02 - interaction.bodyOffsetY * 0.06;
        const headYaw = -0.18 + Math.sin(timeMs / 1900 + 0.6) * 0.05 + interaction.gazeX * 0.62;
        const headPitch = -0.12 + Math.cos(timeMs / 2400 + 1.1) * 0.03 - interaction.gazeY * 0.38;
        const sceneCenterX = size * 0.5;
        const sceneCenterY = size * 0.57;
        const bodyWidth = size * 0.225;
        const bodyHeight = size * 0.245;
        const bodyDepth = size * 0.145;
        const headSize = size * 0.24;
        const headLift = size * 0.205;
        const headForwardShift = interaction.intensity * size * 0.018;
        const sceneCuboids: ReadonlyArray<MinecraftSceneCuboid> = [
            {
                center: {
                    x: interaction.bodyOffsetX * size * 0.026,
                    y: size * 0.05 + interaction.bodyOffsetY * size * 0.018 + bob,
                    z: 0,
                },
                width: bodyWidth,
                height: bodyHeight,
                depth: bodyDepth,
                rotationX: bodyPitch,
                rotationY: bodyYaw,
                textures: torsoTextures,
                outlineColor: `${palette.shadow}cc`,
            },
            {
                center: {
                    x: interaction.bodyOffsetX * size * 0.018 + interaction.gazeX * size * 0.016,
                    y: -headLift + bob * 1.15,
                    z: headForwardShift,
                },
                width: headSize,
                height: headSize,
                depth: headSize,
                rotationX: headPitch,
                rotationY: headYaw,
                textures: headTextures,
                outlineColor: `${palette.shadow}dd`,
            },
        ];
        const visibleFaces = sceneCuboids
            .flatMap((cuboid) => resolveVisibleCuboidFaces(cuboid, size, sceneCenterX, sceneCenterY))
            .sort((firstFace, secondFace) => firstFace.averageDepth - secondFace.averageDepth);

        drawAvatarFrame(context, size, palette);
        drawMinecraftBackdrop(context, size, palette, sceneCenterX, spotlightY, interaction, timeMs);
        drawMinecraftShadow(context, size, palette, interaction, timeMs);

        for (const visibleFace of visibleFaces) {
            drawTexturedProjectedFace(context, visibleFace);
        }
    },
};

/**
 * Draws the shared background atmosphere behind the Minecraft 3D 2 portrait.
 *
 * @param context Canvas 2D context.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param sceneCenterX Horizontal scene center.
 * @param spotlightY Vertical spotlight anchor.
 * @param interaction Smoothed pointer-aware interaction state.
 * @param timeMs Current animation time in milliseconds.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function drawMinecraftBackdrop(
    context: CanvasRenderingContext2D,
    size: number,
    palette: AvatarPalette,
    sceneCenterX: number,
    spotlightY: number,
    interaction: {
        readonly gazeX: number;
        readonly gazeY: number;
        readonly intensity: number;
    },
    timeMs: number,
): void {
    const spotlightGradient = context.createRadialGradient(
        sceneCenterX + interaction.gazeX * size * 0.08,
        spotlightY + interaction.gazeY * size * 0.05,
        size * 0.03,
        sceneCenterX,
        spotlightY,
        size * 0.52,
    );
    spotlightGradient.addColorStop(0, `${palette.highlight}66`);
    spotlightGradient.addColorStop(0.42, `${palette.accent}1d`);
    spotlightGradient.addColorStop(1, `${palette.highlight}00`);
    context.fillStyle = spotlightGradient;
    context.fillRect(0, 0, size, size);

    const rimGradient = context.createLinearGradient(0, size * 0.14, 0, size * 0.92);
    rimGradient.addColorStop(0, `${palette.highlight}12`);
    rimGradient.addColorStop(0.55, `${palette.secondary}0a`);
    rimGradient.addColorStop(1, `${palette.shadow}00`);
    context.fillStyle = rimGradient;
    context.fillRect(0, 0, size, size);

    context.save();
    context.globalAlpha = 0.08 + interaction.intensity * 0.04;
    context.fillStyle = palette.highlight;
    context.beginPath();
    context.arc(
        size * 0.72 + Math.sin(timeMs / 1600) * size * 0.03,
        size * 0.2 + Math.cos(timeMs / 1400) * size * 0.018,
        size * 0.025,
        0,
        Math.PI * 2,
    );
    context.fill();
    context.restore();
}

/**
 * Draws the soft floor shadow used to anchor the cuboids in the frame.
 *
 * @param context Canvas 2D context.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param interaction Smoothed pointer-aware interaction state.
 * @param timeMs Current animation time in milliseconds.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function drawMinecraftShadow(
    context: CanvasRenderingContext2D,
    size: number,
    palette: AvatarPalette,
    interaction: {
        readonly gazeX: number;
        readonly intensity: number;
    },
    timeMs: number,
): void {
    context.save();
    context.fillStyle = `${palette.shadow}66`;
    context.filter = `blur(${size * 0.02}px)`;
    context.beginPath();
    context.ellipse(
        size * 0.5 + interaction.gazeX * size * 0.03,
        size * 0.85 + Math.sin(timeMs / 880) * size * 0.01,
        size * (0.16 + interaction.intensity * 0.015),
        size * 0.055,
        0,
        0,
        Math.PI * 2,
    );
    context.fill();
    context.restore();
}

/**
 * Resolves all visible projected faces for one scene cuboid.
 *
 * @param cuboid Scene cuboid definition.
 * @param size Canvas size in CSS pixels.
 * @param sceneCenterX Horizontal scene center.
 * @param sceneCenterY Vertical scene center.
 * @returns Visible faces sorted later by depth.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function resolveVisibleCuboidFaces(
    cuboid: MinecraftSceneCuboid,
    size: number,
    sceneCenterX: number,
    sceneCenterY: number,
): Array<VisibleCuboidFace> {
    const halfWidth = cuboid.width / 2;
    const halfHeight = cuboid.height / 2;
    const halfDepth = cuboid.depth / 2;
    const faceDefinitions = [
        {
            texture: cuboid.textures.front,
            corners: [
                { x: -halfWidth, y: -halfHeight, z: halfDepth },
                { x: halfWidth, y: -halfHeight, z: halfDepth },
                { x: halfWidth, y: halfHeight, z: halfDepth },
                { x: -halfWidth, y: halfHeight, z: halfDepth },
            ] as const,
        },
        {
            texture: cuboid.textures.back,
            corners: [
                { x: halfWidth, y: -halfHeight, z: -halfDepth },
                { x: -halfWidth, y: -halfHeight, z: -halfDepth },
                { x: -halfWidth, y: halfHeight, z: -halfDepth },
                { x: halfWidth, y: halfHeight, z: -halfDepth },
            ] as const,
        },
        {
            texture: cuboid.textures.right,
            corners: [
                { x: halfWidth, y: -halfHeight, z: halfDepth },
                { x: halfWidth, y: -halfHeight, z: -halfDepth },
                { x: halfWidth, y: halfHeight, z: -halfDepth },
                { x: halfWidth, y: halfHeight, z: halfDepth },
            ] as const,
        },
        {
            texture: cuboid.textures.left,
            corners: [
                { x: -halfWidth, y: -halfHeight, z: -halfDepth },
                { x: -halfWidth, y: -halfHeight, z: halfDepth },
                { x: -halfWidth, y: halfHeight, z: halfDepth },
                { x: -halfWidth, y: halfHeight, z: -halfDepth },
            ] as const,
        },
        {
            texture: cuboid.textures.top,
            corners: [
                { x: -halfWidth, y: -halfHeight, z: -halfDepth },
                { x: halfWidth, y: -halfHeight, z: -halfDepth },
                { x: halfWidth, y: -halfHeight, z: halfDepth },
                { x: -halfWidth, y: -halfHeight, z: halfDepth },
            ] as const,
        },
        {
            texture: cuboid.textures.bottom,
            corners: [
                { x: -halfWidth, y: halfHeight, z: halfDepth },
                { x: halfWidth, y: halfHeight, z: halfDepth },
                { x: halfWidth, y: halfHeight, z: -halfDepth },
                { x: -halfWidth, y: halfHeight, z: -halfDepth },
            ] as const,
        },
    ];

    const visibleFaces: Array<VisibleCuboidFace | null> = faceDefinitions.map((faceDefinition) => {
        const transformedCorners = faceDefinition.corners.map((corner) =>
            transformScenePoint(corner, cuboid.center, cuboid.rotationX, cuboid.rotationY),
        ) as [Point3D, Point3D, Point3D, Point3D];
        const faceNormal = normalizeVector3(
            crossProduct3D(
                subtractPoint3D(transformedCorners[1], transformedCorners[0]),
                subtractPoint3D(transformedCorners[2], transformedCorners[0]),
            ),
        );

        if (faceNormal.z <= 0.02) {
            return null;
        }

        const projectedCorners = transformedCorners.map((corner) =>
            projectScenePoint(corner, size, sceneCenterX, sceneCenterY),
        ) as [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];

        return {
            corners: projectedCorners,
            texture: faceDefinition.texture,
            averageDepth:
                transformedCorners.reduce((depthSum, corner) => depthSum + corner.z, 0) / transformedCorners.length,
            lightIntensity: clampNumber(dotProduct3D(faceNormal, LIGHT_DIRECTION), -1, 1),
            outlineColor: cuboid.outlineColor,
        } satisfies VisibleCuboidFace;
    });

    return visibleFaces.filter((visibleFace): visibleFace is VisibleCuboidFace => visibleFace !== null);
}

/**
 * Draws one projected textured face by tessellating its texture cells into quads.
 *
 * @param context Canvas 2D context.
 * @param face Visible projected face.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function drawTexturedProjectedFace(context: CanvasRenderingContext2D, face: VisibleCuboidFace): void {
    const rows = face.texture.length;
    const columns = face.texture[0]?.length || 0;

    if (rows === 0 || columns === 0) {
        return;
    }

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        for (let columnIndex = 0; columnIndex < columns; columnIndex++) {
            const startX = columnIndex / columns;
            const endX = (columnIndex + 1) / columns;
            const startY = rowIndex / rows;
            const endY = (rowIndex + 1) / rows;

            drawProjectedQuad(
                context,
                [
                    interpolateProjectedQuad(face.corners, startX, startY),
                    interpolateProjectedQuad(face.corners, endX, startY),
                    interpolateProjectedQuad(face.corners, endX, endY),
                    interpolateProjectedQuad(face.corners, startX, endY),
                ],
                face.texture[rowIndex]![columnIndex]!,
            );
        }
    }

    if (face.lightIntensity > 0) {
        drawProjectedQuad(context, face.corners, `rgba(255, 255, 255, ${0.15 * face.lightIntensity})`);
    } else if (face.lightIntensity < 0) {
        drawProjectedQuad(context, face.corners, `rgba(0, 0, 0, ${0.22 * Math.abs(face.lightIntensity)})`);
    }

    context.save();
    context.beginPath();
    context.moveTo(face.corners[0].x, face.corners[0].y);
    for (let cornerIndex = 1; cornerIndex < face.corners.length; cornerIndex++) {
        context.lineTo(face.corners[cornerIndex]!.x, face.corners[cornerIndex]!.y);
    }
    context.closePath();
    context.strokeStyle = face.outlineColor;
    context.lineWidth = Math.max(1.1, getProjectedQuadPerimeter(face.corners) * 0.0045);
    context.lineJoin = 'round';
    context.stroke();
    context.restore();
}

/**
 * Draws one filled projected quad.
 *
 * @param context Canvas 2D context.
 * @param corners Quad corners in clockwise order.
 * @param fillStyle CSS fill style.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function drawProjectedQuad(
    context: CanvasRenderingContext2D,
    corners: readonly [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint],
    fillStyle: string,
): void {
    context.beginPath();
    context.moveTo(corners[0].x, corners[0].y);
    context.lineTo(corners[1].x, corners[1].y);
    context.lineTo(corners[2].x, corners[2].y);
    context.lineTo(corners[3].x, corners[3].y);
    context.closePath();
    context.fillStyle = fillStyle;
    context.fill();
}

/**
 * Interpolates one point inside a projected quad across both quad axes.
 *
 * @param corners Quad corners in clockwise order.
 * @param horizontalRatio Horizontal ratio in the range `[0, 1]`.
 * @param verticalRatio Vertical ratio in the range `[0, 1]`.
 * @returns Interpolated projected point.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function interpolateProjectedQuad(
    corners: readonly [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint],
    horizontalRatio: number,
    verticalRatio: number,
): ProjectedPoint {
    const topPoint = interpolateProjectedPoint(corners[0], corners[1], horizontalRatio);
    const bottomPoint = interpolateProjectedPoint(corners[3], corners[2], horizontalRatio);

    return interpolateProjectedPoint(topPoint, bottomPoint, verticalRatio);
}

/**
 * Interpolates between two projected points.
 *
 * @param startPoint Start point.
 * @param endPoint End point.
 * @param ratio Interpolation ratio in the range `[0, 1]`.
 * @returns Interpolated projected point.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function interpolateProjectedPoint(
    startPoint: ProjectedPoint,
    endPoint: ProjectedPoint,
    ratio: number,
): ProjectedPoint {
    return {
        x: startPoint.x + (endPoint.x - startPoint.x) * ratio,
        y: startPoint.y + (endPoint.y - startPoint.y) * ratio,
        z: startPoint.z + (endPoint.z - startPoint.z) * ratio,
    };
}

/**
 * Projects one rotated scene point into canvas coordinates.
 *
 * @param point Scene point.
 * @param size Canvas size in CSS pixels.
 * @param sceneCenterX Horizontal scene center.
 * @param sceneCenterY Vertical scene center.
 * @returns Projected point.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function projectScenePoint(point: Point3D, size: number, sceneCenterX: number, sceneCenterY: number): ProjectedPoint {
    const cameraDistance = size * CAMERA_DISTANCE_RATIO;
    const perspectiveScale = cameraDistance / Math.max(cameraDistance - point.z, cameraDistance * 0.35);

    return {
        x: sceneCenterX + point.x * perspectiveScale,
        y: sceneCenterY + point.y * perspectiveScale,
        z: point.z,
    };
}

/**
 * Applies the local cuboid rotations and translation to one scene point.
 *
 * @param localPoint Point in cuboid-local space.
 * @param center Cuboid center in scene space.
 * @param rotationX Cuboid pitch in radians.
 * @param rotationY Cuboid yaw in radians.
 * @returns Transformed scene-space point.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function transformScenePoint(localPoint: Point3D, center: Point3D, rotationX: number, rotationY: number): Point3D {
    const yawedPoint = rotatePointAroundY(localPoint, rotationY);
    const pitchedPoint = rotatePointAroundX(yawedPoint, rotationX);

    return {
        x: center.x + pitchedPoint.x,
        y: center.y + pitchedPoint.y,
        z: center.z + pitchedPoint.z,
    };
}

/**
 * Rotates one point around the local Y axis.
 *
 * @param point Source point.
 * @param angle Rotation angle in radians.
 * @returns Rotated point.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function rotatePointAroundY(point: Point3D, angle: number): Point3D {
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
 * @private helper of `minecraft2AvatarVisual`
 */
function rotatePointAroundX(point: Point3D, angle: number): Point3D {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    return {
        x: point.x,
        y: point.y * cosine - point.z * sine,
        z: point.y * sine + point.z * cosine,
    };
}

/**
 * Subtracts one 3D point from another.
 *
 * @param leftPoint Left point.
 * @param rightPoint Right point.
 * @returns Difference vector.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function subtractPoint3D(leftPoint: Point3D, rightPoint: Point3D): Point3D {
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
 * @private helper of `minecraft2AvatarVisual`
 */
function crossProduct3D(leftVector: Point3D, rightVector: Point3D): Point3D {
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
 * @private helper of `minecraft2AvatarVisual`
 */
function dotProduct3D(leftVector: Point3D, rightVector: Point3D): number {
    return leftVector.x * rightVector.x + leftVector.y * rightVector.y + leftVector.z * rightVector.z;
}

/**
 * Normalizes one 3D vector while keeping zero vectors stable.
 *
 * @param vector Source vector.
 * @returns Normalized vector.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function normalizeVector3(vector: Point3D): Point3D {
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
 * Clamps one number into the provided range.
 *
 * @param value Input value.
 * @param minimumValue Inclusive lower bound.
 * @param maximumValue Inclusive upper bound.
 * @returns Clamped value.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function clampNumber(value: number, minimumValue: number, maximumValue: number): number {
    return Math.min(maximumValue, Math.max(minimumValue, value));
}

/**
 * Measures the perimeter of one projected quad.
 *
 * @param corners Quad corners.
 * @returns Perimeter length.
 *
 * @private helper of `minecraft2AvatarVisual`
 */
function getProjectedQuadPerimeter(
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
