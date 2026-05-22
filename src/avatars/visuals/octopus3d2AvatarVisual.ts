/* eslint-disable no-magic-numbers */

import { drawAvatarFrame } from '../avatarRenderingUtils';
import type { AvatarPalette, AvatarVisualDefinition } from '../types/AvatarVisualDefinition';
import {
    clampNumber,
    crossProduct3D,
    dotProduct3D,
    getProjectedQuadPerimeter,
    normalizeVector3,
    projectScenePoint,
    subtractPoint3D,
    transformScenePoint,
    type Point3D,
    type ProjectedPoint,
} from './avatar3dProjectionShared';
import {
    drawProjectedOrganicEye,
    drawProjectedOrganicMouth,
    drawProjectedQuad,
} from './octopus3dAvatarVisualShared';
import { createOctopus3MorphologyProfile, type Octopus3MorphologyProfile } from './octopus3AvatarVisual';

/**
 * One visible projected patch on the continuous Octopus 3D 2 mesh.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
type BlobbyOctopusSurfacePatch = {
    readonly corners: [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];
    readonly averageDepth: number;
    readonly lightIntensity: number;
    readonly fillStyle: string;
    readonly outlineColor: string;
};

/**
 * Stable shape options for the single blobby octopus mesh.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
type BlobbyOctopusSurfaceOptions = {
    readonly radiusX: number;
    readonly radiusY: number;
    readonly radiusZ: number;
    readonly morphologyProfile: Octopus3MorphologyProfile;
    readonly timeMs: number;
    readonly animationPhase: number;
};

/**
 * Light direction used by the single-mesh octopus shading.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
const LIGHT_DIRECTION: Point3D = normalizeVector3({
    x: 0.38,
    y: -0.6,
    z: 0.98,
});

/**
 * Octopus 3D 2 avatar visual.
 *
 * @private built-in avatar visual
 */
export const octopus3d2AvatarVisual: AvatarVisualDefinition = {
    id: 'octopus3d2',
    title: 'Octopus 3D 2',
    description: 'Continuous blobby 3D octopus portrait with one soft mesh, turning silhouette, and cursor-aware eyes.',
    isAnimated: true,
    supportsPointerTracking: true,
    render({ context, size, palette, createRandom, timeMs, interaction }) {
        const morphologyProfile = createOctopus3MorphologyProfile(createRandom);
        const animationRandom = createRandom('octopus3d2-animation-profile');
        const eyeRandom = createRandom('octopus3d2-eye-profile');
        const animationPhase = animationRandom() * Math.PI * 2;
        const sceneCenterX = size * 0.5;
        const sceneCenterY = size * 0.575;
        const bob = Math.sin(timeMs / 940 + animationPhase) * size * 0.013;
        const meshCenter: Point3D = {
            x: interaction.bodyOffsetX * size * 0.044 + size * morphologyProfile.body.centerXJitterRatio * 0.5,
            y: -size * 0.03 + interaction.bodyOffsetY * size * 0.026 + bob,
            z: interaction.intensity * size * 0.018,
        };
        const rotationY =
            -0.14 +
            Math.sin(timeMs / 2600 + animationPhase) * 0.04 +
            interaction.bodyOffsetX * 0.2 +
            interaction.gazeX * 0.78;
        const rotationX =
            -0.06 +
            Math.cos(timeMs / 3000 + animationPhase * 0.7) * 0.02 -
            interaction.bodyOffsetY * 0.08 -
            interaction.gazeY * 0.34;
        const surfaceOptions: BlobbyOctopusSurfaceOptions = {
            radiusX: size * morphologyProfile.body.bodyRadiusRatio * morphologyProfile.body.horizontalStretch * 1.02,
            radiusY: size * morphologyProfile.body.bodyRadiusRatio * morphologyProfile.body.verticalStretch * 1.22,
            radiusZ:
                size *
                morphologyProfile.body.bodyRadiusRatio *
                (0.98 + (morphologyProfile.body.horizontalStretch - 1) * 0.2),
            morphologyProfile,
            timeMs,
            animationPhase,
        };
        const surfacePatches = resolveVisibleBlobbyOctopusPatches({
            ...surfaceOptions,
            center: meshCenter,
            rotationX,
            rotationY,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
        });
        const eyeLatitude = clampNumber(morphologyProfile.face.eyeCenterYOffsetRatio * 4.4, -0.16, 0.11);
        const eyeLongitude = clampNumber(morphologyProfile.face.eyeSpacingRatio * 3.25, 0.2, 0.34);
        const mouthLatitude = clampNumber(
            eyeLatitude + 0.19 + morphologyProfile.face.mouthYOffsetRatio * 1.08,
            0.08,
            0.34,
        );
        const mouthCenterLongitude = clampNumber(morphologyProfile.face.mouthCenterOffsetRatio * 5.8, -0.08, 0.08);
        const mouthHalfLongitude = clampNumber(eyeLongitude * 0.82, 0.16, 0.29);
        const mouthCurveLatitude = clampNumber(
            mouthLatitude + morphologyProfile.face.mouthCurveDepthRatio * 0.85,
            mouthLatitude + 0.03,
            0.42,
        );

        drawAvatarFrame(context, size, palette);
        drawBlobbyOctopusAtmosphere(context, size, palette, sceneCenterX, sceneCenterY, interaction, timeMs);
        drawBlobbyOctopusShadow(context, size, palette, interaction, timeMs, morphologyProfile);

        for (const surfacePatch of surfacePatches.sort(
            (firstSurfacePatch, secondSurfacePatch) => firstSurfacePatch.averageDepth - secondSurfacePatch.averageDepth,
        )) {
            drawBlobbySurfacePatch(context, surfacePatch);
        }

        const leftEyeLocalCenter = sampleBlobbyOctopusSurfacePoint(surfaceOptions, eyeLatitude, -eyeLongitude);
        const rightEyeLocalCenter = sampleBlobbyOctopusSurfacePoint(surfaceOptions, eyeLatitude, eyeLongitude);
        const eyeRadiusX = size * morphologyProfile.face.eyeRadiusXRatio * 0.78;
        const eyeRadiusY = eyeRadiusX * morphologyProfile.face.eyeHeightRatio * 0.92;
        drawProjectedOrganicEye(
            context,
            leftEyeLocalCenter,
            eyeRadiusX,
            eyeRadiusY,
            meshCenter,
            rotationX,
            rotationY,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
            timeMs,
            animationPhase + eyeRandom() * 0.7,
            interaction,
            morphologyProfile.face.eyeStyle,
        );
        drawProjectedOrganicEye(
            context,
            rightEyeLocalCenter,
            eyeRadiusX,
            eyeRadiusY,
            meshCenter,
            rotationX,
            rotationY,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
            timeMs,
            animationPhase + 0.9 + eyeRandom() * 0.7,
            interaction,
            morphologyProfile.face.eyeStyle,
        );

        drawProjectedOrganicMouth(
            context,
            [
                sampleBlobbyOctopusSurfacePoint(surfaceOptions, mouthLatitude, mouthCenterLongitude - mouthHalfLongitude),
                sampleBlobbyOctopusSurfacePoint(surfaceOptions, mouthCurveLatitude, mouthCenterLongitude),
                sampleBlobbyOctopusSurfacePoint(surfaceOptions, mouthLatitude, mouthCenterLongitude + mouthHalfLongitude),
            ],
            meshCenter,
            rotationX,
            rotationY,
            sceneCenterX,
            sceneCenterY,
            palette,
            size,
        );
    },
};

/**
 * Draws the deep-water glow behind the continuous octopus mesh.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function drawBlobbyOctopusAtmosphere(
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
        sceneCenterX + interaction.gazeX * size * 0.11,
        sceneCenterY - size * 0.17 + interaction.gazeY * size * 0.05,
        size * 0.05,
        sceneCenterX,
        sceneCenterY - size * 0.03,
        size * 0.66,
    );
    glowGradient.addColorStop(0, `${palette.highlight}5e`);
    glowGradient.addColorStop(0.38, `${palette.accent}26`);
    glowGradient.addColorStop(1, `${palette.highlight}00`);
    context.fillStyle = glowGradient;
    context.fillRect(0, 0, size, size);

    const lowerGradient = context.createRadialGradient(
        sceneCenterX + Math.sin(timeMs / 1650) * size * 0.045,
        sceneCenterY + size * 0.28,
        size * 0.06,
        sceneCenterX,
        sceneCenterY + size * 0.28,
        size * 0.52,
    );
    lowerGradient.addColorStop(0, `${palette.secondary}22`);
    lowerGradient.addColorStop(1, `${palette.secondary}00`);
    context.fillStyle = lowerGradient;
    context.fillRect(0, 0, size, size);
}

/**
 * Draws the soft floor shadow that anchors the single mesh in the frame.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function drawBlobbyOctopusShadow(
    context: CanvasRenderingContext2D,
    size: number,
    palette: AvatarPalette,
    interaction: {
        readonly gazeX: number;
        readonly intensity: number;
    },
    timeMs: number,
    morphologyProfile: Octopus3MorphologyProfile,
): void {
    context.save();
    context.fillStyle = `${palette.shadow}66`;
    context.filter = `blur(${size * 0.024}px)`;
    context.beginPath();
    context.ellipse(
        size * 0.5 + interaction.gazeX * size * 0.045,
        size * 0.88 + Math.sin(timeMs / 940) * size * 0.008,
        size * (0.18 + (morphologyProfile.body.horizontalStretch - 1) * 0.04 + interaction.intensity * 0.018),
        size * 0.062,
        0,
        0,
        Math.PI * 2,
    );
    context.fill();
    context.restore();
}

/**
 * Resolves all visible projected patches for the single blobby octopus mesh.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function resolveVisibleBlobbyOctopusPatches(options: {
    readonly center: Point3D;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly radiusZ: number;
    readonly morphologyProfile: Octopus3MorphologyProfile;
    readonly timeMs: number;
    readonly animationPhase: number;
    readonly rotationX: number;
    readonly rotationY: number;
    readonly sceneCenterX: number;
    readonly sceneCenterY: number;
    readonly size: number;
    readonly palette: AvatarPalette;
}): Array<BlobbyOctopusSurfacePatch> {
    const {
        center,
        rotationX,
        rotationY,
        sceneCenterX,
        sceneCenterY,
        size,
        palette,
        morphologyProfile,
        animationPhase,
        timeMs,
    } = options;
    const latitudePatchCount = 12;
    const longitudePatchCount = 24;
    const surfacePatches: Array<BlobbyOctopusSurfacePatch> = [];

    for (let latitudeIndex = 0; latitudeIndex < latitudePatchCount; latitudeIndex++) {
        const startLatitude = -Math.PI / 2 + (latitudeIndex / latitudePatchCount) * Math.PI;
        const endLatitude = -Math.PI / 2 + ((latitudeIndex + 1) / latitudePatchCount) * Math.PI;
        const centerLatitude = (startLatitude + endLatitude) / 2;
        const verticalProgress = (Math.sin(centerLatitude) + 1) / 2;

        for (let longitudeIndex = 0; longitudeIndex < longitudePatchCount; longitudeIndex++) {
            const startLongitude = -Math.PI + (longitudeIndex / longitudePatchCount) * Math.PI * 2;
            const endLongitude = -Math.PI + ((longitudeIndex + 1) / longitudePatchCount) * Math.PI * 2;
            const centerLongitude = (startLongitude + endLongitude) / 2;
            const localCorners = [
                sampleBlobbyOctopusSurfacePoint(options, startLatitude, startLongitude),
                sampleBlobbyOctopusSurfacePoint(options, startLatitude, endLongitude),
                sampleBlobbyOctopusSurfacePoint(options, endLatitude, endLongitude),
                sampleBlobbyOctopusSurfacePoint(options, endLatitude, startLongitude),
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
                fillStyle: resolveBlobbySurfacePatchFillStyle(
                    palette,
                    verticalProgress,
                    Math.max(0, Math.cos(centerLongitude)),
                    resolveLowerLobeWave(centerLongitude, morphologyProfile, animationPhase, timeMs),
                ),
                outlineColor: verticalProgress < 0.58 ? `${palette.highlight}73` : `${palette.shadow}8a`,
            });
        }
    }

    return surfacePatches;
}

/**
 * Samples one point on the continuous Octopus 3D 2 surface.
 *
 * The lower hemisphere widens and falls into soft lobe waves so the octopus stays one connected mesh
 * instead of switching to separately rendered tentacles.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function sampleBlobbyOctopusSurfacePoint(
    options: BlobbyOctopusSurfaceOptions,
    latitude: number,
    longitude: number,
): Point3D {
    const { radiusX, radiusY, radiusZ, morphologyProfile, timeMs, animationPhase } = options;
    const cosineLatitude = Math.max(0, Math.cos(latitude));
    const verticalProgress = (Math.sin(latitude) + 1) / 2;
    const upperBlend = Math.pow(1 - verticalProgress, 1.2);
    const lowerBlend = Math.pow(verticalProgress, 1.42);
    const lowerLobeWave = resolveLowerLobeWave(longitude, morphologyProfile, animationPhase, timeMs);
    const skirtEnvelope = Math.pow(cosineLatitude, 0.5) * lowerBlend;
    const horizontalScale =
        1.02 +
        skirtEnvelope *
            (0.34 +
                (morphologyProfile.tentacles.rootSpreadScale - 1) * 0.22 +
                lowerLobeWave * 0.22) -
        upperBlend * 0.08;
    const depthScale =
        1.04 +
        upperBlend * 0.16 +
        Math.max(0, Math.cos(longitude)) * 0.1 +
        skirtEnvelope * (0.08 + lowerLobeWave * 0.06) -
        Math.max(0, -Math.cos(longitude)) * 0.04;
    const lowerDrop =
        skirtEnvelope *
        radiusY *
        (0.28 + lowerLobeWave * 0.14 + (morphologyProfile.tentacles.flowLengthScale - 1) * 0.12);
    const swayX = Math.sin(timeMs / 1250 + longitude * 1.8 + animationPhase) * skirtEnvelope * radiusX * 0.05;
    const swayZ = Math.cos(timeMs / 1480 + longitude * 1.2 - animationPhase * 0.7) * skirtEnvelope * radiusZ * 0.03;

    return {
        x: Math.sin(longitude) * cosineLatitude * radiusX * horizontalScale + swayX,
        y:
            Math.sin(latitude) * radiusY * (1 + upperBlend * 0.14) -
            upperBlend * radiusY * 0.1 +
            lowerDrop +
            Math.sin(timeMs / 1780 + animationPhase + latitude * 1.4) * skirtEnvelope * radiusY * 0.02,
        z: Math.cos(longitude) * cosineLatitude * radiusZ * depthScale + swayZ,
    };
}

/**
 * Resolves the soft lower-lobe wave that makes the silhouette read more like a real octopus.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function resolveLowerLobeWave(
    longitude: number,
    morphologyProfile: Octopus3MorphologyProfile,
    animationPhase: number,
    timeMs: number,
): number {
    const lobeCount = Math.max(
        4,
        Math.round((morphologyProfile.body.lobeCount + morphologyProfile.tentacles.count) / 2),
    );

    return (Math.cos(longitude * lobeCount + animationPhase + timeMs / 1040) + 1) / 2;
}

/**
 * Resolves one base fill tone for a surface patch on the single octopus mesh.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function resolveBlobbySurfacePatchFillStyle(
    palette: AvatarPalette,
    verticalProgress: number,
    forwardness: number,
    lowerLobeWave: number,
): string {
    const tonalProgress = clampNumber(verticalProgress + lowerLobeWave * 0.12 - forwardness * 0.07, 0, 1);

    if (tonalProgress < 0.16) {
        return palette.highlight;
    }
    if (tonalProgress < 0.34) {
        return palette.secondary;
    }
    if (tonalProgress < 0.72) {
        return forwardness > 0.58 ? palette.secondary : palette.primary;
    }

    return `${palette.shadow}f2`;
}

/**
 * Draws one projected patch with soft octopus shading.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function drawBlobbySurfacePatch(context: CanvasRenderingContext2D, surfacePatch: BlobbyOctopusSurfacePatch): void {
    drawProjectedQuad(context, surfacePatch.corners, surfacePatch.fillStyle);

    if (surfacePatch.lightIntensity > 0) {
        drawProjectedQuad(context, surfacePatch.corners, `rgba(255, 255, 255, ${0.16 * surfacePatch.lightIntensity})`);
    } else if (surfacePatch.lightIntensity < 0) {
        drawProjectedQuad(
            context,
            surfacePatch.corners,
            `rgba(0, 0, 0, ${0.24 * Math.abs(surfacePatch.lightIntensity)})`,
        );
    }

    context.save();
    context.beginPath();
    context.moveTo(surfacePatch.corners[0].x, surfacePatch.corners[0].y);
    for (let cornerIndex = 1; cornerIndex < surfacePatch.corners.length; cornerIndex++) {
        context.lineTo(surfacePatch.corners[cornerIndex]!.x, surfacePatch.corners[cornerIndex]!.y);
    }
    context.closePath();
    context.strokeStyle = surfacePatch.outlineColor;
    context.lineWidth = Math.max(1, getProjectedQuadPerimeter(surfacePatch.corners) * 0.0042);
    context.lineJoin = 'round';
    context.stroke();
    context.restore();
}
