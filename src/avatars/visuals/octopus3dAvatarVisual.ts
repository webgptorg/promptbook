/* eslint-disable no-magic-numbers */

import { drawAvatarFrame } from '../avatarRenderingUtils';
import type { AvatarPalette, AvatarVisualDefinition } from '../types/AvatarVisualDefinition';
import {
    clampNumber,
    crossProduct3D,
    dotProduct3D,
    normalizeVector3,
    projectScenePoint,
    subtractPoint3D,
    transformScenePoint,
    type Point3D,
    type ProjectedPoint,
} from './avatar3dProjectionShared';
import { createOctopus3MorphologyProfile, type Octopus3MorphologyProfile } from './octopus3AvatarVisual';
import {
    drawOctopus3dSurfacePatch,
    drawProjectedOctopusEye,
    drawProjectedOctopusMouth,
    resolveEllipsoidSurfaceDepth,
    resolveOrganic3dSurfacePatchFillStyle,
    type Octopus3dSurfacePatch,
} from './octopus3dAvatarVisualShared';

/**
 * One projected 3D tentacle stroke.
 *
 * @private helper of `octopus3dAvatarVisual`
 */
type OctopusTentacleStroke = {
    readonly projectedPoints: ReadonlyArray<ProjectedPoint>;
    readonly averageDepth: number;
    readonly isFrontFacing: boolean;
    readonly baseWidth: number;
    readonly tipWidth: number;
    readonly colorBias: number;
};

/**
 * Light direction used by the organic 3D octopus shading.
 *
 * @private helper of `octopus3dAvatarVisual`
 */
const LIGHT_DIRECTION: Point3D = normalizeVector3({
    x: 0.48,
    y: -0.62,
    z: 0.94,
});

/**
 * Proper 3D Octopus visual built from projected organic meshes and tentacles.
 *
 * @private built-in avatar visual
 */
export const octopus3dAvatarVisual: AvatarVisualDefinition = {
    id: 'octopus3d',
    title: 'Octopus 3D',
    description: 'Proper 3D octopus portrait with a turning silhouette, expressive eyes, and depth-sorted tentacles.',
    isAnimated: true,
    supportsPointerTracking: true,
    render({ context, size, palette, createRandom, timeMs, interaction }) {
        const morphologyProfile = createOctopus3MorphologyProfile(createRandom);
        const animationRandom = createRandom('octopus3d-animation-profile');
        const eyeRandom = createRandom('octopus3d-eye-profile');
        const animationPhase = animationRandom() * Math.PI * 2;
        const sceneCenterX = size * 0.5;
        const sceneCenterY = size * 0.56;
        const bob = Math.sin(timeMs / 920 + animationPhase) * size * 0.014;
        const mantleCenter: Point3D = {
            x: interaction.bodyOffsetX * size * 0.042 + size * morphologyProfile.body.centerXJitterRatio * 0.65,
            y: -size * 0.09 + interaction.bodyOffsetY * size * 0.028 + bob,
            z: interaction.intensity * size * 0.012,
        };
        const underbodyCenter: Point3D = {
            x: mantleCenter.x * 0.86,
            y: mantleCenter.y + size * 0.168,
            z: mantleCenter.z - size * 0.018,
        };
        const mantleRadiusX = size * morphologyProfile.body.bodyRadiusRatio * morphologyProfile.body.horizontalStretch;
        const mantleRadiusY =
            size * morphologyProfile.body.bodyRadiusRatio * morphologyProfile.body.verticalStretch * 1.1;
        const mantleRadiusZ =
            size *
            morphologyProfile.body.bodyRadiusRatio *
            (0.9 + (morphologyProfile.body.horizontalStretch - 1) * 0.3);
        const underbodyRadiusX = mantleRadiusX * (0.9 + (morphologyProfile.tentacles.rootSpreadScale - 1) * 0.08);
        const underbodyRadiusY = mantleRadiusY * (0.44 + morphologyProfile.body.lowerDropRatio * 3.1);
        const underbodyRadiusZ = mantleRadiusZ * 0.78;
        const bodyYaw =
            -0.18 +
            Math.sin(timeMs / 2400 + animationPhase) * 0.05 +
            interaction.bodyOffsetX * 0.18 +
            interaction.gazeX * 0.22;
        const bodyPitch =
            -0.08 +
            Math.cos(timeMs / 2700 + animationPhase * 0.6) * 0.025 -
            interaction.bodyOffsetY * 0.08 -
            interaction.gazeY * 0.08;
        const headYaw = bodyYaw - 0.04 + interaction.gazeX * 0.56;
        const headPitch = bodyPitch - 0.02 - interaction.gazeY * 0.32;
        const mantlePatches = resolveVisibleEllipsoidPatches({
            center: mantleCenter,
            radiusX: mantleRadiusX,
            radiusY: mantleRadiusY,
            radiusZ: mantleRadiusZ,
            rotationX: headPitch,
            rotationY: headYaw,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
            verticalColorBias: 0,
            outlineColor: `${palette.highlight}7a`,
        });
        const underbodyPatches = resolveVisibleEllipsoidPatches({
            center: underbodyCenter,
            radiusX: underbodyRadiusX,
            radiusY: underbodyRadiusY,
            radiusZ: underbodyRadiusZ,
            rotationX: bodyPitch,
            rotationY: bodyYaw,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
            verticalColorBias: 0.18,
            outlineColor: `${palette.shadow}8f`,
        });
        const tentacleStrokes = createOctopusTentacleStrokes({
            createRandom,
            morphologyProfile,
            timeMs,
            size,
            center: underbodyCenter,
            radiusX: underbodyRadiusX,
            radiusY: underbodyRadiusY,
            radiusZ: underbodyRadiusZ,
            rotationX: bodyPitch,
            rotationY: bodyYaw,
            sceneCenterX,
            sceneCenterY,
            animationPhase,
        });
        const faceEyeSpacing = size * morphologyProfile.face.eyeSpacingRatio * 0.92;
        const faceEyeYOffset = size * morphologyProfile.face.eyeCenterYOffsetRatio - mantleRadiusY * 0.02;
        const faceEyeRadiusX = size * morphologyProfile.face.eyeRadiusXRatio * 0.82;
        const faceEyeRadiusY = faceEyeRadiusX * morphologyProfile.face.eyeHeightRatio * 0.96;
        const mouthHalfWidth = size * morphologyProfile.face.mouthWidthRatio * 0.92;
        const mouthY = size * morphologyProfile.face.mouthYOffsetRatio + mantleRadiusY * 0.08;

        drawAvatarFrame(context, size, palette);
        drawOctopus3dAtmosphere(context, size, palette, sceneCenterX, sceneCenterY, interaction, timeMs);
        drawOctopus3dShadow(context, size, palette, interaction, timeMs);

        for (const tentacleStroke of tentacleStrokes.filter(
            (candidateTentacleStroke) => !candidateTentacleStroke.isFrontFacing,
        )) {
            drawTentacleStroke(context, tentacleStroke, palette);
        }

        for (const surfacePatch of [...mantlePatches, ...underbodyPatches].sort(
            (firstSurfacePatch, secondSurfacePatch) => firstSurfacePatch.averageDepth - secondSurfacePatch.averageDepth,
        )) {
            drawOctopus3dSurfacePatch(context, surfacePatch);
        }

        for (const tentacleStroke of tentacleStrokes.filter(
            (candidateTentacleStroke) => candidateTentacleStroke.isFrontFacing,
        )) {
            drawTentacleStroke(context, tentacleStroke, palette);
        }

        drawProjectedOctopusEye(
            context,
            {
                x: -faceEyeSpacing,
                y: faceEyeYOffset,
                z: resolveEllipsoidSurfaceDepth(
                    mantleRadiusX,
                    mantleRadiusY,
                    mantleRadiusZ,
                    -faceEyeSpacing,
                    faceEyeYOffset,
                ),
            },
            faceEyeRadiusX,
            faceEyeRadiusY,
            mantleCenter,
            headPitch,
            headYaw,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
            timeMs,
            animationPhase + eyeRandom() * 0.6,
            interaction,
            morphologyProfile.face.eyeStyle,
        );
        drawProjectedOctopusEye(
            context,
            {
                x: faceEyeSpacing,
                y: faceEyeYOffset,
                z: resolveEllipsoidSurfaceDepth(
                    mantleRadiusX,
                    mantleRadiusY,
                    mantleRadiusZ,
                    faceEyeSpacing,
                    faceEyeYOffset,
                ),
            },
            faceEyeRadiusX,
            faceEyeRadiusY,
            mantleCenter,
            headPitch,
            headYaw,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
            timeMs,
            animationPhase + 0.7 + eyeRandom() * 0.6,
            interaction,
            morphologyProfile.face.eyeStyle,
        );

        drawProjectedOctopusMouth(
            context,
            [
                {
                    x: -mouthHalfWidth,
                    y: mouthY,
                    z: resolveEllipsoidSurfaceDepth(
                        mantleRadiusX,
                        mantleRadiusY,
                        mantleRadiusZ,
                        -mouthHalfWidth,
                        mouthY,
                    ),
                },
                {
                    x: size * morphologyProfile.face.mouthCenterOffsetRatio,
                    y:
                        mouthY +
                        size * morphologyProfile.face.mouthCurveDepthRatio * 0.38 +
                        Math.sin(timeMs / 760 + animationPhase) * size * 0.01 +
                        interaction.gazeY * size * 0.01,
                    z: resolveEllipsoidSurfaceDepth(
                        mantleRadiusX,
                        mantleRadiusY,
                        mantleRadiusZ,
                        size * morphologyProfile.face.mouthCenterOffsetRatio,
                        mouthY,
                    ),
                },
                {
                    x: mouthHalfWidth,
                    y: mouthY,
                    z: resolveEllipsoidSurfaceDepth(
                        mantleRadiusX,
                        mantleRadiusY,
                        mantleRadiusZ,
                        mouthHalfWidth,
                        mouthY,
                    ),
                },
            ],
            mantleCenter,
            headPitch,
            headYaw,
            sceneCenterX,
            sceneCenterY,
            palette,
            size,
        );
    },
};

/**
 * Draws the atmospheric underwater glow behind the octopus mesh.
 *
 * @private helper of `octopus3dAvatarVisual`
 */
function drawOctopus3dAtmosphere(
    context: CanvasRenderingContext2D,
    size: number,
    palette: AvatarPalette,
    sceneCenterX: number,
    sceneCenterY: number,
    interaction: {
        readonly gazeX: number;
        readonly gazeY: number;
        readonly intensity: number;
    },
    timeMs: number,
): void {
    const glowGradient = context.createRadialGradient(
        sceneCenterX + interaction.gazeX * size * 0.1,
        sceneCenterY - size * 0.2 + interaction.gazeY * size * 0.05,
        size * 0.04,
        sceneCenterX,
        sceneCenterY - size * 0.04,
        size * 0.62,
    );
    glowGradient.addColorStop(0, `${palette.highlight}5c`);
    glowGradient.addColorStop(0.36, `${palette.accent}24`);
    glowGradient.addColorStop(1, `${palette.highlight}00`);
    context.fillStyle = glowGradient;
    context.fillRect(0, 0, size, size);

    const lowerGradient = context.createRadialGradient(
        sceneCenterX + Math.sin(timeMs / 1700) * size * 0.05,
        sceneCenterY + size * 0.23,
        size * 0.08,
        sceneCenterX,
        sceneCenterY + size * 0.28,
        size * 0.5,
    );
    lowerGradient.addColorStop(0, `${palette.secondary}1d`);
    lowerGradient.addColorStop(1, `${palette.secondary}00`);
    context.fillStyle = lowerGradient;
    context.fillRect(0, 0, size, size);
}

/**
 * Draws the soft ground shadow below the octopus.
 *
 * @private helper of `octopus3dAvatarVisual`
 */
function drawOctopus3dShadow(
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
    context.filter = `blur(${size * 0.022}px)`;
    context.beginPath();
    context.ellipse(
        size * 0.5 + interaction.gazeX * size * 0.04,
        size * 0.87 + Math.sin(timeMs / 920) * size * 0.008,
        size * (0.18 + interaction.intensity * 0.02),
        size * 0.06,
        0,
        0,
        Math.PI * 2,
    );
    context.fill();
    context.restore();
}

/**
 * Resolves visible projected patches for one rotated ellipsoid mesh.
 *
 * @private helper of `octopus3dAvatarVisual`
 */
function resolveVisibleEllipsoidPatches(options: {
    readonly center: Point3D;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly radiusZ: number;
    readonly rotationX: number;
    readonly rotationY: number;
    readonly sceneCenterX: number;
    readonly sceneCenterY: number;
    readonly size: number;
    readonly palette: AvatarPalette;
    readonly verticalColorBias: number;
    readonly outlineColor: string;
}): Array<Octopus3dSurfacePatch> {
    const {
        center,
        radiusX,
        radiusY,
        radiusZ,
        rotationX,
        rotationY,
        sceneCenterX,
        sceneCenterY,
        size,
        palette,
        verticalColorBias,
        outlineColor,
    } = options;
    const latitudePatchCount = 10;
    const longitudePatchCount = 18;
    const surfacePatches: Array<Octopus3dSurfacePatch> = [];

    for (let latitudeIndex = 0; latitudeIndex < latitudePatchCount; latitudeIndex++) {
        const startLatitude = -Math.PI / 2 + (latitudeIndex / latitudePatchCount) * Math.PI;
        const endLatitude = -Math.PI / 2 + ((latitudeIndex + 1) / latitudePatchCount) * Math.PI;
        const verticalProgress = (latitudeIndex + 0.5) / latitudePatchCount;

        for (let longitudeIndex = 0; longitudeIndex < longitudePatchCount; longitudeIndex++) {
            const startLongitude = -Math.PI + (longitudeIndex / longitudePatchCount) * Math.PI * 2;
            const endLongitude = -Math.PI + ((longitudeIndex + 1) / longitudePatchCount) * Math.PI * 2;
            const localCorners = [
                sampleEllipsoidPoint(radiusX, radiusY, radiusZ, startLatitude, startLongitude),
                sampleEllipsoidPoint(radiusX, radiusY, radiusZ, startLatitude, endLongitude),
                sampleEllipsoidPoint(radiusX, radiusY, radiusZ, endLatitude, endLongitude),
                sampleEllipsoidPoint(radiusX, radiusY, radiusZ, endLatitude, startLongitude),
            ] as const;
            const transformedCorners = localCorners.map((localCorner) =>
                transformScenePoint(localCorner, center, rotationX, rotationY),
            ) as [Point3D, Point3D, Point3D, Point3D];
            const surfaceNormal = normalizeVector3(
                crossProduct3D(
                    subtractPoint3D(transformedCorners[1], transformedCorners[0]),
                    subtractPoint3D(transformedCorners[2], transformedCorners[0]),
                ),
            );

            if (surfaceNormal.z <= 0.01) {
                continue;
            }

            const projectedCorners = transformedCorners.map((transformedCorner) =>
                projectScenePoint(transformedCorner, size, sceneCenterX, sceneCenterY),
            ) as [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];
            surfacePatches.push({
                corners: projectedCorners,
                averageDepth:
                    transformedCorners.reduce((depthSum, transformedCorner) => depthSum + transformedCorner.z, 0) /
                    transformedCorners.length,
                lightIntensity: clampNumber(dotProduct3D(surfaceNormal, LIGHT_DIRECTION), -1, 1),
                fillStyle: resolveOrganic3dSurfacePatchFillStyle(palette, verticalProgress + verticalColorBias),
                outlineColor,
            });
        }
    }

    return surfacePatches;
}

/**
 * Samples one point on an ellipsoid aligned to the local axes.
 *
 * @private helper of `octopus3dAvatarVisual`
 */
function sampleEllipsoidPoint(
    radiusX: number,
    radiusY: number,
    radiusZ: number,
    latitude: number,
    longitude: number,
): Point3D {
    const cosineLatitude = Math.cos(latitude);
    return {
        x: Math.sin(longitude) * cosineLatitude * radiusX,
        y: Math.sin(latitude) * radiusY,
        z: Math.cos(longitude) * cosineLatitude * radiusZ,
    };
}

/**
 * Creates the projected 3D tentacle strokes orbiting around the lower octopus body.
 *
 * @private helper of `octopus3dAvatarVisual`
 */
function createOctopusTentacleStrokes(options: {
    readonly createRandom: (salt: string) => () => number;
    readonly morphologyProfile: Octopus3MorphologyProfile;
    readonly timeMs: number;
    readonly size: number;
    readonly center: Point3D;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly radiusZ: number;
    readonly rotationX: number;
    readonly rotationY: number;
    readonly sceneCenterX: number;
    readonly sceneCenterY: number;
    readonly animationPhase: number;
}): Array<OctopusTentacleStroke> {
    const {
        createRandom,
        morphologyProfile,
        timeMs,
        size,
        center,
        radiusX,
        radiusY,
        radiusZ,
        rotationX,
        rotationY,
        sceneCenterX,
        sceneCenterY,
        animationPhase,
    } = options;

    return Array.from({ length: morphologyProfile.tentacles.count }, (_, tentacleIndex) => {
        const tentacleRandom = createRandom(`octopus3d-tentacle-${tentacleIndex}`);
        const spreadProgress =
            morphologyProfile.tentacles.count === 1 ? 0.5 : tentacleIndex / (morphologyProfile.tentacles.count - 1);
        const orbitAngle = -Math.PI * 0.92 + spreadProgress * Math.PI * 1.84 + (tentacleRandom() - 0.5) * 0.16;
        const flowLength =
            size * (0.19 + morphologyProfile.tentacles.flowLengthScale * 0.075 + tentacleRandom() * 0.018);
        const lateralReach =
            size *
            (0.08 + morphologyProfile.tentacles.lateralReachScale * 0.05 + Math.abs(Math.sin(orbitAngle)) * 0.018);
        const depthReach = size * (0.028 + morphologyProfile.tentacles.tipReachScale * 0.032);
        const sway = Math.sin(timeMs / (760 + tentacleIndex * 36) + animationPhase + tentacleRandom() * Math.PI * 2);
        const anchorPoint: Point3D = {
            x: Math.sin(orbitAngle) * radiusX * (0.84 + tentacleRandom() * 0.08),
            y: radiusY * (0.22 + tentacleRandom() * 0.18),
            z: Math.cos(orbitAngle) * radiusZ * (0.72 + tentacleRandom() * 0.12),
        };
        const controlPointOne: Point3D = {
            x: anchorPoint.x + Math.sin(orbitAngle) * lateralReach * 0.44,
            y: anchorPoint.y + flowLength * 0.26,
            z: anchorPoint.z + Math.cos(orbitAngle) * depthReach * 0.3 + sway * size * 0.012,
        };
        const controlPointTwo: Point3D = {
            x:
                anchorPoint.x +
                Math.sin(orbitAngle) * lateralReach * (0.82 + morphologyProfile.tentacles.swayScale * 0.12),
            y: anchorPoint.y + flowLength * 0.66,
            z: anchorPoint.z + Math.cos(orbitAngle) * depthReach * 0.72 + sway * size * 0.02,
        };
        const endPoint: Point3D = {
            x:
                anchorPoint.x +
                Math.sin(orbitAngle) * lateralReach * (1.02 + morphologyProfile.tentacles.tipWidthScale * 0.12) +
                sway * size * 0.028,
            y: anchorPoint.y + flowLength,
            z: anchorPoint.z + Math.cos(orbitAngle) * depthReach + sway * size * 0.016,
        };
        const scenePoints = Array.from({ length: 12 }, (_, sampleIndex) =>
            transformScenePoint(
                sampleCubicBezierPoint3D(anchorPoint, controlPointOne, controlPointTwo, endPoint, sampleIndex / 11),
                center,
                rotationX,
                rotationY,
            ),
        );
        const projectedPoints = scenePoints.map((scenePoint) =>
            projectScenePoint(scenePoint, size, sceneCenterX, sceneCenterY),
        );
        const averageDepth =
            scenePoints.reduce((depthSum, scenePoint) => depthSum + scenePoint.z, 0) / scenePoints.length;
        return {
            projectedPoints,
            averageDepth,
            isFrontFacing: averageDepth >= center.z - size * 0.006,
            baseWidth:
                size *
                (0.019 +
                    morphologyProfile.tentacles.baseWidthScale * 0.007 +
                    tentacleRandom() * 0.003 +
                    Math.abs(Math.sin(orbitAngle)) * 0.002),
            tipWidth: size * (0.0046 + morphologyProfile.tentacles.tipWidthScale * 0.0018),
            colorBias: tentacleRandom(),
        } satisfies OctopusTentacleStroke;
    });
}

/**
 * Samples one point on a cubic Bezier curve in 3D.
 *
 * @private helper of `octopus3dAvatarVisual`
 */
function sampleCubicBezierPoint3D(
    startPoint: Point3D,
    controlPointOne: Point3D,
    controlPointTwo: Point3D,
    endPoint: Point3D,
    progress: number,
): Point3D {
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
        z:
            inverseProgress * inverseProgress * inverseProgress * startPoint.z +
            3 * inverseProgress * inverseProgress * progress * controlPointOne.z +
            3 * inverseProgress * progress * progress * controlPointTwo.z +
            progress * progress * progress * endPoint.z,
    };
}

/**
 * Draws one projected tentacle stroke with a slim highlight ridge.
 *
 * @private helper of `octopus3dAvatarVisual`
 */
function drawTentacleStroke(
    context: CanvasRenderingContext2D,
    tentacleStroke: OctopusTentacleStroke,
    palette: AvatarPalette,
): void {
    const projectedSegments = tentacleStroke.projectedPoints.length - 1;

    for (let segmentIndex = 0; segmentIndex < projectedSegments; segmentIndex++) {
        const startPoint = tentacleStroke.projectedPoints[segmentIndex]!;
        const endPoint = tentacleStroke.projectedPoints[segmentIndex + 1]!;
        const progress = segmentIndex / projectedSegments;
        const width = tentacleStroke.baseWidth + (tentacleStroke.tipWidth - tentacleStroke.baseWidth) * progress;

        context.beginPath();
        context.moveTo(startPoint.x, startPoint.y);
        context.lineTo(endPoint.x, endPoint.y);
        context.strokeStyle = tentacleStroke.colorBias > 0.6 ? `${palette.secondary}f0` : `${palette.primary}f0`;
        context.lineWidth = width;
        context.lineCap = 'round';
        context.stroke();

        context.beginPath();
        context.moveTo(startPoint.x, startPoint.y);
        context.lineTo(endPoint.x, endPoint.y);
        context.strokeStyle = tentacleStroke.isFrontFacing ? `${palette.highlight}80` : `${palette.highlight}40`;
        context.lineWidth = Math.max(1, width * 0.34);
        context.lineCap = 'round';
        context.stroke();
    }
}
