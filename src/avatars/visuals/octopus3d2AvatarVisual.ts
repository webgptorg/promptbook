/* eslint-disable no-magic-numbers */

import { drawAvatarFrame } from '../avatarRenderingUtils';
import type { AvatarPalette, AvatarVisualDefinition } from '../types/AvatarVisualDefinition';
import type { Point3D, ProjectedPoint } from './avatar3dProjectionShared';
import {
    clampNumber,
    crossProduct3D,
    dotProduct3D,
    getProjectedQuadPerimeter,
    normalizeVector3,
    projectScenePoint,
    subtractPoint3D,
    transformScenePoint,
} from './avatar3dProjectionShared';
import type { Octopus3MorphologyProfile } from './octopus3AvatarVisual';
import { createOctopus3MorphologyProfile } from './octopus3AvatarVisual';
import { drawProjectedOrganicEye, drawProjectedOrganicMouth, drawProjectedQuad } from './octopus3dAvatarVisualShared';

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
 * Per-avatar stable state derived once from the seeded random factory and reused across frames.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
type Octopus3d2StableState = {
    readonly morphologyProfile: Octopus3MorphologyProfile;
    readonly animationPhase: number;
    readonly leftEyePhaseOffset: number;
    readonly rightEyePhaseOffset: number;
};

/**
 * Cache keyed by the `createRandom` factory reference (stable per mounted `<Avatar/>`).
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
const octopus3d2StableStateCache = new WeakMap<(salt: string) => () => number, Octopus3d2StableState>();

/**
 * Returns the stable per-avatar state, computing it on first access and caching for subsequent frames.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function getOctopus3d2StableState(createRandom: (salt: string) => () => number): Octopus3d2StableState {
    const cached = octopus3d2StableStateCache.get(createRandom);

    if (cached !== undefined) {
        return cached;
    }

    const animationRandom = createRandom('octopus3d2-animation-profile');
    const eyeRandom = createRandom('octopus3d2-eye-profile');
    const leftEyePhaseOffset = eyeRandom() * 0.7;
    const rightEyePhaseOffset = eyeRandom() * 0.7;
    const state: Octopus3d2StableState = {
        morphologyProfile: createOctopus3MorphologyProfile(createRandom),
        animationPhase: animationRandom() * Math.PI * 2,
        leftEyePhaseOffset,
        rightEyePhaseOffset,
    };

    octopus3d2StableStateCache.set(createRandom, state);

    return state;
}

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
        const { morphologyProfile, animationPhase, leftEyePhaseOffset, rightEyePhaseOffset } =
            getOctopus3d2StableState(createRandom);
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
            animationPhase + leftEyePhaseOffset,
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
            animationPhase + 0.9 + rightEyePhaseOffset,
            interaction,
            morphologyProfile.face.eyeStyle,
        );

        drawProjectedOrganicMouth(
            context,
            [
                sampleBlobbyOctopusSurfacePoint(
                    surfaceOptions,
                    mouthLatitude,
                    mouthCenterLongitude - mouthHalfLongitude,
                ),
                sampleBlobbyOctopusSurfacePoint(surfaceOptions, mouthCurveLatitude, mouthCenterLongitude),
                sampleBlobbyOctopusSurfacePoint(
                    surfaceOptions,
                    mouthLatitude,
                    mouthCenterLongitude + mouthHalfLongitude,
                ),
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
 * Uses a scaled radial gradient instead of `context.filter = 'blur()'` to approximate the
 * blurry ellipse without triggering a costly software rasterization pass on every frame.
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
    const cx = size * 0.5 + interaction.gazeX * size * 0.045;
    const cy = size * 0.88 + Math.sin(timeMs / 940) * size * 0.008;
    const rx = size * (0.18 + (morphologyProfile.body.horizontalStretch - 1) * 0.04 + interaction.intensity * 0.018);
    const ry = size * 0.062;

    context.save();
    context.translate(cx, cy);
    context.scale(1, ry / rx);
    const blurRadius = rx * 1.4;
    const shadowGradient = context.createRadialGradient(0, 0, 0, 0, 0, blurRadius);
    shadowGradient.addColorStop(0, `${palette.shadow}7a`);
    shadowGradient.addColorStop(0.45, `${palette.shadow}44`);
    shadowGradient.addColorStop(0.8, `${palette.shadow}1a`);
    shadowGradient.addColorStop(1, `${palette.shadow}00`);
    context.fillStyle = shadowGradient;
    context.beginPath();
    context.arc(0, 0, blurRadius, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

/**
 * Number of latitude segments used by the single blobby octopus mesh.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
const LATITUDE_PATCH_COUNT = 12;

/**
 * Number of longitude segments used by the single blobby octopus mesh.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
const LONGITUDE_PATCH_COUNT = 24;

/**
 * Resolves all visible projected patches for the single blobby octopus mesh.
 *
 * Within a single frame, mesh corner samples and longitude-only lobe-wave values are
 * quantized to the patch grid and computed once each rather than re-evaluated for every
 * patch corner — the patch loop alone would call `sampleBlobbyOctopusSurfacePoint`
 * `latitudePatchCount * longitudePatchCount * 4` times without caching, even though most
 * corners are shared between neighboring patches.
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
    const latitudePatchCount = LATITUDE_PATCH_COUNT;
    const longitudePatchCount = LONGITUDE_PATCH_COUNT;
    const surfacePatches: Array<BlobbyOctopusSurfacePatch> = [];
    const latitudeBoundaries = new Float64Array(latitudePatchCount + 1);
    const longitudeBoundaries = new Float64Array(longitudePatchCount + 1);

    for (let boundaryIndex = 0; boundaryIndex <= latitudePatchCount; boundaryIndex++) {
        latitudeBoundaries[boundaryIndex] = -Math.PI / 2 + (boundaryIndex / latitudePatchCount) * Math.PI;
    }

    for (let boundaryIndex = 0; boundaryIndex <= longitudePatchCount; boundaryIndex++) {
        longitudeBoundaries[boundaryIndex] = -Math.PI + (boundaryIndex / longitudePatchCount) * Math.PI * 2;
    }

    const cachedLobeWavesByCornerLongitude = new Float64Array(longitudePatchCount + 1);

    for (let boundaryIndex = 0; boundaryIndex <= longitudePatchCount; boundaryIndex++) {
        cachedLobeWavesByCornerLongitude[boundaryIndex] = resolveLowerLobeWave(
            longitudeBoundaries[boundaryIndex]!,
            morphologyProfile,
            animationPhase,
            timeMs,
        );
    }

    const cornerCount = (latitudePatchCount + 1) * (longitudePatchCount + 1);
    const transformedCornerSamples = new Array<Point3D>(cornerCount);

    for (let latitudeBoundaryIndex = 0; latitudeBoundaryIndex <= latitudePatchCount; latitudeBoundaryIndex++) {
        const cornerLatitude = latitudeBoundaries[latitudeBoundaryIndex]!;

        for (let longitudeBoundaryIndex = 0; longitudeBoundaryIndex <= longitudePatchCount; longitudeBoundaryIndex++) {
            const cornerLongitude = longitudeBoundaries[longitudeBoundaryIndex]!;
            const cornerIndex = latitudeBoundaryIndex * (longitudePatchCount + 1) + longitudeBoundaryIndex;
            const cornerSample = sampleBlobbyOctopusSurfacePointWithLongitudeCache(
                options,
                cornerLatitude,
                cornerLongitude,
                cachedLobeWavesByCornerLongitude[longitudeBoundaryIndex]!,
            );
            transformedCornerSamples[cornerIndex] = transformScenePoint(cornerSample, center, rotationX, rotationY);
        }
    }

    for (let latitudeIndex = 0; latitudeIndex < latitudePatchCount; latitudeIndex++) {
        const startLatitude = latitudeBoundaries[latitudeIndex]!;
        const endLatitude = latitudeBoundaries[latitudeIndex + 1]!;
        const centerLatitude = (startLatitude + endLatitude) / 2;
        const verticalProgress = (Math.sin(centerLatitude) + 1) / 2;
        const startCornerRowOffset = latitudeIndex * (longitudePatchCount + 1);
        const endCornerRowOffset = (latitudeIndex + 1) * (longitudePatchCount + 1);

        for (let longitudeIndex = 0; longitudeIndex < longitudePatchCount; longitudeIndex++) {
            const startLongitude = longitudeBoundaries[longitudeIndex]!;
            const endLongitude = longitudeBoundaries[longitudeIndex + 1]!;
            const centerLongitude = (startLongitude + endLongitude) / 2;
            const transformedCorners: [Point3D, Point3D, Point3D, Point3D] = [
                transformedCornerSamples[startCornerRowOffset + longitudeIndex]!,
                transformedCornerSamples[startCornerRowOffset + longitudeIndex + 1]!,
                transformedCornerSamples[endCornerRowOffset + longitudeIndex + 1]!,
                transformedCornerSamples[endCornerRowOffset + longitudeIndex]!,
            ];
            const surfaceNormal = normalizeVector3(
                crossProduct3D(
                    subtractPoint3D(transformedCorners[1], transformedCorners[0]),
                    subtractPoint3D(transformedCorners[2], transformedCorners[0]),
                ),
            );

            if (surfaceNormal.z <= 0.01) {
                continue;
            }

            const projectedCorners: [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint] = [
                projectScenePoint(transformedCorners[0], size, sceneCenterX, sceneCenterY),
                projectScenePoint(transformedCorners[1], size, sceneCenterX, sceneCenterY),
                projectScenePoint(transformedCorners[2], size, sceneCenterX, sceneCenterY),
                projectScenePoint(transformedCorners[3], size, sceneCenterX, sceneCenterY),
            ];
            surfacePatches.push({
                corners: projectedCorners,
                averageDepth:
                    (transformedCorners[0].z +
                        transformedCorners[1].z +
                        transformedCorners[2].z +
                        transformedCorners[3].z) /
                    4,
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
    const { morphologyProfile, animationPhase, timeMs } = options;
    return sampleBlobbyOctopusSurfacePointWithLongitudeCache(
        options,
        latitude,
        longitude,
        resolveLowerLobeWave(longitude, morphologyProfile, animationPhase, timeMs),
    );
}

/**
 * Samples one point on the continuous Octopus 3D 2 surface using a precomputed lower-lobe wave
 * to skip the per-call trig evaluation for `latitudePatchCount + 1` longitude-shared corners.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function sampleBlobbyOctopusSurfacePointWithLongitudeCache(
    options: BlobbyOctopusSurfaceOptions,
    latitude: number,
    longitude: number,
    lowerLobeWave: number,
): Point3D {
    const { radiusX, radiusY, radiusZ, morphologyProfile, timeMs, animationPhase } = options;
    const cosineLatitude = Math.max(0, Math.cos(latitude));
    const verticalProgress = (Math.sin(latitude) + 1) / 2;
    const upperBlend = Math.pow(1 - verticalProgress, 1.2);
    const lowerBlend = Math.pow(verticalProgress, 1.42);
    const skirtEnvelope = Math.pow(cosineLatitude, 0.5) * lowerBlend;
    const horizontalScale =
        1.02 +
        skirtEnvelope * (0.34 + (morphologyProfile.tentacles.rootSpreadScale - 1) * 0.22 + lowerLobeWave * 0.22) -
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
