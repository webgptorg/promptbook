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
import { drawProjectedOrganicEye, drawProjectedOrganicMouth, drawProjectedQuad } from './octopus3dAvatarVisualShared';
import { createOctopus3MorphologyProfile, type Octopus3MorphologyProfile } from './octopus3AvatarVisual';

/**
 * One visible projected patch on the continuous Octopus 3D 4 mesh.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
type BlobbyContinuousSurfacePatch = {
    readonly corners: [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];
    readonly averageDepth: number;
    readonly lightIntensity: number;
    readonly rimLightIntensity: number;
    readonly fillStyle: string;
    readonly outlineColor: string;
};

/**
 * Seeded profile for one continuous lower mesh lobe that reads as a tentacle.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
type BlobbyContinuousTentacleProfile = {
    readonly centerLongitude: number;
    readonly widthScale: number;
    readonly lengthScale: number;
    readonly swayScale: number;
    readonly depthScale: number;
    readonly curlScale: number;
    readonly primaryPhase: number;
    readonly secondaryPhase: number;
    readonly suckerSide: -1 | 1;
};

/**
 * Stable surface options used by the continuous Octopus 3D 4 mesh sampler.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
type BlobbyContinuousSurfaceOptions = {
    readonly radiusX: number;
    readonly radiusY: number;
    readonly radiusZ: number;
    readonly morphologyProfile: Octopus3MorphologyProfile;
    readonly timeMs: number;
    readonly animationPhase: number;
    readonly tentacleProfiles: ReadonlyArray<BlobbyContinuousTentacleProfile>;
};

/**
 * Smoothly blended influence of nearby tentacle lobes at one longitude.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
type BlobbyContinuousTentacleInfluence = {
    readonly core: number;
    readonly centerLongitude: number;
    readonly widthScale: number;
    readonly lengthScale: number;
    readonly swayScale: number;
    readonly depthScale: number;
    readonly curlScale: number;
    readonly primaryPhase: number;
    readonly secondaryPhase: number;
};

/**
 * One seeded skin-spot used as a subtle pigment patch on the octopus body.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
type BlobbySkinSpot = {
    readonly latitude: number;
    readonly longitude: number;
    readonly radiusScale: number;
    readonly opacity: number;
};

/**
 * Light direction used by the continuous Octopus 3D 4 mesh shading.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
const LIGHT_DIRECTION: Point3D = normalizeVector3({
    x: 0.32,
    y: -0.66,
    z: 1,
});

/**
 * Rim-light direction used to brighten the side of the silhouette.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
const RIM_LIGHT_DIRECTION: Point3D = normalizeVector3({
    x: -0.7,
    y: -0.18,
    z: 0.55,
});

/**
 * Real-octopus tentacle count used by the continuous lower mesh.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
const OCTOPUS_TENTACLE_COUNT = 8;

/**
 * Number of seeded skin spots painted across the octopus body.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
const SKIN_SPOT_COUNT = 14;

/**
 * Per-avatar stable state derived once from the seeded random factory and reused across frames.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
type Octopus3d4StableState = {
    readonly morphologyProfile: Octopus3MorphologyProfile;
    readonly animationPhase: number;
    readonly leftEyePhaseOffset: number;
    readonly rightEyePhaseOffset: number;
    readonly tentacleProfiles: ReadonlyArray<BlobbyContinuousTentacleProfile>;
    readonly skinSpots: ReadonlyArray<BlobbySkinSpot>;
};

/**
 * Cache keyed by the `createRandom` factory reference, stable per mounted `<Avatar/>` component.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
const octopus3d4StableStateCache = new WeakMap<(salt: string) => () => number, Octopus3d4StableState>();

/**
 * Returns the stable per-avatar state, computing it on first access and caching afterwards.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function getOctopus3d4StableState(createRandom: (salt: string) => () => number): Octopus3d4StableState {
    const cached = octopus3d4StableStateCache.get(createRandom);

    if (cached !== undefined) {
        return cached;
    }

    const morphologyProfile = createOctopus3MorphologyProfile(createRandom);
    const animationRandom = createRandom('octopus3d4-animation-profile');
    const eyeRandom = createRandom('octopus3d4-eye-profile');
    const leftEyePhaseOffset = eyeRandom() * 0.7;
    const rightEyePhaseOffset = eyeRandom() * 0.7;
    const state: Octopus3d4StableState = {
        morphologyProfile,
        animationPhase: animationRandom() * Math.PI * 2,
        leftEyePhaseOffset,
        rightEyePhaseOffset,
        tentacleProfiles: createBlobbyContinuousTentacleProfiles(createRandom, morphologyProfile),
        skinSpots: createBlobbySkinSpots(createRandom),
    };

    octopus3d4StableStateCache.set(createRandom, state);

    return state;
}

/**
 * Octopus 3D 4 avatar visual.
 *
 * @private built-in avatar visual
 */
export const octopus3d4AvatarVisual: AvatarVisualDefinition = {
    id: 'octopus3d4',
    title: 'Octopus 3D 4',
    description:
        'Cute blobby 3D octopus rendered as one smooth continuous mesh with naturally undulating tentacles, rich multi-pass shading, pigment spots, and cursor-aware head and eyes.',
    isAnimated: true,
    supportsPointerTracking: true,
    render({ context, size, palette, createRandom, timeMs, interaction }) {
        const { morphologyProfile, animationPhase, leftEyePhaseOffset, rightEyePhaseOffset, tentacleProfiles, skinSpots } =
            getOctopus3d4StableState(createRandom);
        const sceneCenterX = size * 0.5;
        const sceneCenterY = size * 0.535;
        const bob = Math.sin(timeMs / 980 + animationPhase) * size * 0.013;
        const meshCenter: Point3D = {
            x: interaction.bodyOffsetX * size * 0.052 + size * morphologyProfile.body.centerXJitterRatio * 0.44,
            y: -size * 0.07 + interaction.bodyOffsetY * size * 0.028 + bob,
            z: interaction.intensity * size * 0.02,
        };
        const rotationY =
            -0.08 +
            Math.sin(timeMs / 2800 + animationPhase) * 0.04 +
            interaction.bodyOffsetX * 0.24 +
            interaction.gazeX * 0.98;
        const rotationX =
            -0.07 +
            Math.cos(timeMs / 3200 + animationPhase * 0.7) * 0.02 -
            interaction.bodyOffsetY * 0.08 -
            interaction.gazeY * 0.42;
        const surfaceOptions: BlobbyContinuousSurfaceOptions = {
            radiusX: size * morphologyProfile.body.bodyRadiusRatio * morphologyProfile.body.horizontalStretch * 1.12,
            radiusY: size * morphologyProfile.body.bodyRadiusRatio * morphologyProfile.body.verticalStretch * 1.1,
            radiusZ:
                size *
                morphologyProfile.body.bodyRadiusRatio *
                (1.04 + (morphologyProfile.body.horizontalStretch - 1) * 0.2),
            morphologyProfile,
            timeMs,
            animationPhase,
            tentacleProfiles,
        };
        const surfacePatches = resolveVisibleBlobbyContinuousPatches({
            ...surfaceOptions,
            center: meshCenter,
            rotationX,
            rotationY,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
        });
        const eyeLatitude = clampNumber(morphologyProfile.face.eyeCenterYOffsetRatio * 4.4 - 0.04, -0.24, 0.08);
        const eyeLongitude = clampNumber(morphologyProfile.face.eyeSpacingRatio * 3.0, 0.18, 0.32);
        const mouthLatitude = clampNumber(eyeLatitude + 0.21 + morphologyProfile.face.mouthYOffsetRatio, 0.08, 0.34);
        const mouthCenterLongitude = clampNumber(morphologyProfile.face.mouthCenterOffsetRatio * 5.6, -0.08, 0.08);
        const mouthHalfLongitude = clampNumber(eyeLongitude * 0.78, 0.15, 0.28);
        const mouthCurveLatitude = clampNumber(
            mouthLatitude + morphologyProfile.face.mouthCurveDepthRatio * 0.78,
            mouthLatitude + 0.03,
            0.42,
        );
        const eyeRadiusX = size * morphologyProfile.face.eyeRadiusXRatio * 0.78;
        const eyeRadiusY = eyeRadiusX * morphologyProfile.face.eyeHeightRatio * 0.92;

        drawAvatarFrame(context, size, palette);
        drawBlobbyContinuousAtmosphere(context, size, palette, sceneCenterX, sceneCenterY, interaction, timeMs);
        drawBlobbyContinuousShadow(context, size, palette, interaction, timeMs, morphologyProfile);

        for (const surfacePatch of surfacePatches.sort(
            (firstSurfacePatch, secondSurfacePatch) => firstSurfacePatch.averageDepth - secondSurfacePatch.averageDepth,
        )) {
            drawBlobbyContinuousSurfacePatch(context, surfacePatch);
        }

        drawBlobbySkinSpots({
            context,
            surfaceOptions,
            center: meshCenter,
            rotationX,
            rotationY,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
            skinSpots,
        });

        drawBlobbyContinuousCurrents({
            context,
            surfaceOptions,
            center: meshCenter,
            rotationX,
            rotationY,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
            morphologyProfile,
            timeMs,
            animationPhase,
        });
        drawBlobbyContinuousSuckers({
            context,
            surfaceOptions,
            center: meshCenter,
            rotationX,
            rotationY,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
        });

        drawBlobbyContinuousGloss({
            context,
            surfaceOptions,
            center: meshCenter,
            rotationX,
            rotationY,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
        });

        drawProjectedOrganicEye(
            context,
            sampleBlobbyContinuousSurfacePoint(surfaceOptions, eyeLatitude, -eyeLongitude),
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
            sampleBlobbyContinuousSurfacePoint(surfaceOptions, eyeLatitude, eyeLongitude),
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
            animationPhase + 0.85 + rightEyePhaseOffset,
            interaction,
            morphologyProfile.face.eyeStyle,
        );

        drawProjectedOrganicMouth(
            context,
            [
                sampleBlobbyContinuousSurfacePoint(
                    surfaceOptions,
                    mouthLatitude,
                    mouthCenterLongitude - mouthHalfLongitude,
                ),
                sampleBlobbyContinuousSurfacePoint(surfaceOptions, mouthCurveLatitude, mouthCenterLongitude),
                sampleBlobbyContinuousSurfacePoint(
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
 * Creates seeded tentacle-lobe profiles around the visible lower octopus body.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function createBlobbyContinuousTentacleProfiles(
    createRandom: (salt: string) => () => number,
    morphologyProfile: Octopus3MorphologyProfile,
): ReadonlyArray<BlobbyContinuousTentacleProfile> {
    return Array.from({ length: OCTOPUS_TENTACLE_COUNT }, (_, tentacleIndex) => {
        const tentacleRandom = createRandom(`octopus3d4-tentacle-${tentacleIndex}`);
        const progress = tentacleIndex / (OCTOPUS_TENTACLE_COUNT - 1);

        return {
            centerLongitude:
                -Math.PI * 0.9 +
                progress * Math.PI * 1.8 +
                (tentacleRandom() - 0.5) * (0.06 + morphologyProfile.tentacles.rootSpreadScale * 0.025),
            widthScale: 0.92 + tentacleRandom() * 0.3 + (morphologyProfile.tentacles.baseWidthScale - 1) * 0.18,
            lengthScale: 0.9 + tentacleRandom() * 0.34 + (morphologyProfile.tentacles.flowLengthScale - 1) * 0.24,
            swayScale: 0.86 + tentacleRandom() * 0.4 + (morphologyProfile.tentacles.swayScale - 1) * 0.22,
            depthScale: 0.9 + tentacleRandom() * 0.3 + (morphologyProfile.tentacles.tipReachScale - 1) * 0.22,
            curlScale: 0.62 + tentacleRandom() * 0.46,
            primaryPhase: tentacleRandom() * Math.PI * 2,
            secondaryPhase: tentacleRandom() * Math.PI * 2,
            suckerSide: tentacleRandom() > 0.5 ? 1 : -1,
        };
    });
}

/**
 * Creates seeded skin pigment spots distributed across the upper octopus mesh.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function createBlobbySkinSpots(createRandom: (salt: string) => () => number): ReadonlyArray<BlobbySkinSpot> {
    const spotRandom = createRandom('octopus3d4-skin-spots');

    return Array.from({ length: SKIN_SPOT_COUNT }, () => ({
        latitude: -0.45 + spotRandom() * 0.7,
        longitude: -0.5 + spotRandom() * 1.0,
        radiusScale: 0.0028 + spotRandom() * 0.0052,
        opacity: 0.16 + spotRandom() * 0.22,
    }));
}

/**
 * Draws the soft underwater atmosphere behind the continuous octopus mesh.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function drawBlobbyContinuousAtmosphere(
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
        sceneCenterX + interaction.gazeX * size * 0.12,
        sceneCenterY - size * 0.18 + interaction.gazeY * size * 0.05,
        size * 0.04,
        sceneCenterX,
        sceneCenterY,
        size * (0.68 + interaction.intensity * 0.025),
    );
    glowGradient.addColorStop(0, `${palette.highlight}74`);
    glowGradient.addColorStop(0.32, `${palette.accent}32`);
    glowGradient.addColorStop(1, `${palette.highlight}00`);
    context.fillStyle = glowGradient;
    context.fillRect(0, 0, size, size);

    const lowerGradient = context.createRadialGradient(
        sceneCenterX + Math.sin(timeMs / 1500) * size * 0.05,
        sceneCenterY + size * 0.3,
        size * 0.06,
        sceneCenterX,
        sceneCenterY + size * 0.3,
        size * 0.56,
    );
    lowerGradient.addColorStop(0, `${palette.secondary}28`);
    lowerGradient.addColorStop(1, `${palette.secondary}00`);
    context.fillStyle = lowerGradient;
    context.fillRect(0, 0, size, size);
}

/**
 * Draws the soft lower shadow that anchors the octopus in the avatar frame.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function drawBlobbyContinuousShadow(
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
    const cx = size * 0.5 + interaction.gazeX * size * 0.046;
    const cy = size * 0.9 + Math.sin(timeMs / 980) * size * 0.007;
    const rx = size * (0.2 + morphologyProfile.tentacles.rootSpreadScale * 0.024 + interaction.intensity * 0.022);
    const ry = size * 0.062;

    context.save();
    context.translate(cx, cy);
    context.scale(1, ry / rx);
    const blurRadius = rx * 1.42;
    const shadowGradient = context.createRadialGradient(0, 0, 0, 0, 0, blurRadius);
    shadowGradient.addColorStop(0, `${palette.shadow}82`);
    shadowGradient.addColorStop(0.45, `${palette.shadow}4a`);
    shadowGradient.addColorStop(0.8, `${palette.shadow}1c`);
    shadowGradient.addColorStop(1, `${palette.shadow}00`);
    context.fillStyle = shadowGradient;
    context.beginPath();
    context.arc(0, 0, blurRadius, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

/**
 * Number of latitude segments used by the continuous Octopus 3D 4 mesh.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
const LATITUDE_PATCH_COUNT = 20;

/**
 * Number of longitude segments used by the continuous Octopus 3D 4 mesh.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
const LONGITUDE_PATCH_COUNT = 48;

/**
 * Resolves visible projected patches for the continuous Octopus 3D 4 mesh.
 *
 * Within a single frame, mesh corner samples and longitude-only computations (tentacle
 * influence and lobe wave) are quantized to the patch grid and computed once each rather
 * than re-evaluated for every patch corner.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function resolveVisibleBlobbyContinuousPatches(
    options: BlobbyContinuousSurfaceOptions & {
        readonly center: Point3D;
        readonly rotationX: number;
        readonly rotationY: number;
        readonly sceneCenterX: number;
        readonly sceneCenterY: number;
        readonly size: number;
        readonly palette: AvatarPalette;
    },
): Array<BlobbyContinuousSurfacePatch> {
    const { center, rotationX, rotationY, sceneCenterX, sceneCenterY, size, palette } = options;
    const latitudePatchCount = LATITUDE_PATCH_COUNT;
    const longitudePatchCount = LONGITUDE_PATCH_COUNT;
    const surfacePatches: Array<BlobbyContinuousSurfacePatch> = [];
    const latitudeBoundaries = new Float64Array(latitudePatchCount + 1);
    const longitudeBoundaries = new Float64Array(longitudePatchCount + 1);

    for (let boundaryIndex = 0; boundaryIndex <= latitudePatchCount; boundaryIndex++) {
        latitudeBoundaries[boundaryIndex] = -Math.PI / 2 + (boundaryIndex / latitudePatchCount) * Math.PI;
    }

    for (let boundaryIndex = 0; boundaryIndex <= longitudePatchCount; boundaryIndex++) {
        longitudeBoundaries[boundaryIndex] = -Math.PI + (boundaryIndex / longitudePatchCount) * Math.PI * 2;
    }

    const cachedTentacleInfluencesByCornerLongitude = new Array<BlobbyContinuousTentacleInfluence>(
        longitudePatchCount + 1,
    );
    const cachedLobeWavesByCornerLongitude = new Float64Array(longitudePatchCount + 1);
    const cachedTentacleInfluencesByPatchCenterLongitude = new Array<BlobbyContinuousTentacleInfluence>(
        longitudePatchCount,
    );
    const cachedLobeWavesByPatchCenterLongitude = new Float64Array(longitudePatchCount);
    const cachedCosByPatchCenterLongitude = new Float64Array(longitudePatchCount);

    for (let boundaryIndex = 0; boundaryIndex <= longitudePatchCount; boundaryIndex++) {
        const cornerLongitude = longitudeBoundaries[boundaryIndex]!;
        cachedTentacleInfluencesByCornerLongitude[boundaryIndex] = resolveBlobbyTentacleInfluence(
            options,
            cornerLongitude,
        );
        cachedLobeWavesByCornerLongitude[boundaryIndex] = resolveBlobbyLobeWave(options, cornerLongitude);
    }

    for (let longitudeIndex = 0; longitudeIndex < longitudePatchCount; longitudeIndex++) {
        const patchCenterLongitude = (longitudeBoundaries[longitudeIndex]! + longitudeBoundaries[longitudeIndex + 1]!) / 2;
        cachedTentacleInfluencesByPatchCenterLongitude[longitudeIndex] = resolveBlobbyTentacleInfluence(
            options,
            patchCenterLongitude,
        );
        cachedLobeWavesByPatchCenterLongitude[longitudeIndex] = resolveBlobbyLobeWave(options, patchCenterLongitude);
        cachedCosByPatchCenterLongitude[longitudeIndex] = Math.max(0, Math.cos(patchCenterLongitude));
    }

    const cornerCount = (latitudePatchCount + 1) * (longitudePatchCount + 1);
    const transformedCornerSamples = new Array<Point3D>(cornerCount);

    for (let latitudeBoundaryIndex = 0; latitudeBoundaryIndex <= latitudePatchCount; latitudeBoundaryIndex++) {
        const cornerLatitude = latitudeBoundaries[latitudeBoundaryIndex]!;

        for (let longitudeBoundaryIndex = 0; longitudeBoundaryIndex <= longitudePatchCount; longitudeBoundaryIndex++) {
            const cornerLongitude = longitudeBoundaries[longitudeBoundaryIndex]!;
            const cornerIndex = latitudeBoundaryIndex * (longitudePatchCount + 1) + longitudeBoundaryIndex;
            const cornerSample = sampleBlobbyContinuousSurfacePointWithLongitudeCache(
                options,
                cornerLatitude,
                cornerLongitude,
                cachedTentacleInfluencesByCornerLongitude[longitudeBoundaryIndex]!,
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

            if (surfaceNormal.z <= 0.006) {
                continue;
            }

            const projectedCorners: [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint] = [
                projectScenePoint(transformedCorners[0], size, sceneCenterX, sceneCenterY),
                projectScenePoint(transformedCorners[1], size, sceneCenterX, sceneCenterY),
                projectScenePoint(transformedCorners[2], size, sceneCenterX, sceneCenterY),
                projectScenePoint(transformedCorners[3], size, sceneCenterX, sceneCenterY),
            ];
            const lightIntensity = clampNumber(dotProduct3D(surfaceNormal, LIGHT_DIRECTION), -1, 1);
            const rimLightIntensity = Math.pow(
                clampNumber(dotProduct3D(surfaceNormal, RIM_LIGHT_DIRECTION), 0, 1),
                2.6,
            );

            surfacePatches.push({
                corners: projectedCorners,
                averageDepth:
                    (transformedCorners[0].z +
                        transformedCorners[1].z +
                        transformedCorners[2].z +
                        transformedCorners[3].z) /
                    4,
                lightIntensity,
                rimLightIntensity,
                fillStyle: resolveBlobbySurfacePatchFillStyle(
                    palette,
                    verticalProgress,
                    cachedCosByPatchCenterLongitude[longitudeIndex]!,
                    cachedTentacleInfluencesByPatchCenterLongitude[longitudeIndex]!.core,
                    cachedLobeWavesByPatchCenterLongitude[longitudeIndex]!,
                ),
                outlineColor: verticalProgress < 0.52 ? `${palette.highlight}5c` : `${palette.shadow}66`,
            });
        }
    }

    return surfacePatches;
}

/**
 * Samples one point on the continuous Octopus 3D 4 surface.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function sampleBlobbyContinuousSurfacePoint(
    options: BlobbyContinuousSurfaceOptions,
    latitude: number,
    longitude: number,
): Point3D {
    return sampleBlobbyContinuousSurfacePointWithLongitudeCache(
        options,
        latitude,
        longitude,
        resolveBlobbyTentacleInfluence(options, longitude),
        resolveBlobbyLobeWave(options, longitude),
    );
}

/**
 * Samples one point on the continuous Octopus 3D 4 surface using precomputed longitude-only values.
 *
 * The patch loop quantizes the mesh into a fixed corner grid, so the same longitude is reused
 * across every latitude row and each tentacle/lobe value is computed once per frame instead
 * of `latitudePatchCount * 4` times.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function sampleBlobbyContinuousSurfacePointWithLongitudeCache(
    options: BlobbyContinuousSurfaceOptions,
    latitude: number,
    longitude: number,
    tentacleInfluence: BlobbyContinuousTentacleInfluence,
    lowerLobeWave: number,
): Point3D {
    const { radiusX, radiusY, radiusZ, morphologyProfile, timeMs, animationPhase } = options;
    const cosineLatitude = Math.max(0, Math.cos(latitude));
    const verticalProgress = (Math.sin(latitude) + 1) / 2;
    const upperBlend = Math.pow(1 - verticalProgress, 1.32);
    const lowerBlend = smoothStep(0.34, 1, verticalProgress);
    const tipBlend = smoothStep(0.66, 1, verticalProgress);
    const centerPull = resolveSignedAngularDistance(longitude, tentacleInfluence.centerLongitude);
    const effectiveLongitude =
        longitude + centerPull * lowerBlend * tentacleInfluence.core * (0.26 + tipBlend * 0.22);
    const mantleRipple =
        Math.sin(
            longitude * morphologyProfile.body.lobeCount +
                animationPhase * 0.6 +
                timeMs / (1700 + morphologyProfile.body.lobeCount * 28),
        ) *
        (0.018 + morphologyProfile.body.wobbleAmplitudeRatio * 0.78) *
        (0.32 + lowerBlend * 0.7);
    const primaryTentacleWave =
        Math.sin(timeMs / 740 + tentacleInfluence.primaryPhase + verticalProgress * 2.6) *
        lowerBlend *
        tentacleInfluence.core *
        tentacleInfluence.swayScale;
    const secondaryTentacleWave =
        Math.sin(timeMs / 470 + tentacleInfluence.secondaryPhase + verticalProgress * 4.2) *
        lowerBlend *
        tentacleInfluence.core *
        tentacleInfluence.swayScale *
        0.42;
    const tentacleCurl =
        Math.sin(timeMs / 1180 + tentacleInfluence.primaryPhase * 0.6 + verticalProgress * 3.2) *
        tipBlend *
        tentacleInfluence.core *
        tentacleInfluence.curlScale *
        0.36;
    const horizontalScale =
        1.06 +
        mantleRipple +
        lowerBlend * (0.18 + (morphologyProfile.tentacles.rootSpreadScale - 1) * 0.12) +
        lowerBlend * tentacleInfluence.core * (0.22 + lowerLobeWave * 0.14) -
        upperBlend * 0.08;
    const depthScale =
        1.08 +
        upperBlend * 0.16 +
        Math.max(0, Math.cos(effectiveLongitude)) * 0.12 +
        lowerBlend * tentacleInfluence.core * (0.12 + tentacleInfluence.depthScale * 0.07) -
        Math.max(0, -Math.cos(effectiveLongitude)) * 0.05;
    const tentacleTubeRadius =
        lowerBlend *
        tentacleInfluence.core *
        (0.12 + tipBlend * 0.07 + tentacleInfluence.widthScale * 0.028) *
        radiusX;
    const planarRadiusX = cosineLatitude * radiusX * horizontalScale + tentacleTubeRadius;
    const planarRadiusZ = cosineLatitude * radiusZ * depthScale + tentacleTubeRadius * 0.74;
    const lowerDrop =
        lowerBlend *
        radiusY *
        (0.2 +
            tentacleInfluence.core *
                (0.42 +
                    tentacleInfluence.lengthScale * 0.24 +
                    (morphologyProfile.tentacles.flowLengthScale - 1) * 0.1));
    const combinedTentacleSway = (primaryTentacleWave + secondaryTentacleWave) * radiusX * (0.06 + tipBlend * 0.06);

    return {
        x:
            Math.sin(effectiveLongitude) * planarRadiusX +
            combinedTentacleSway +
            tentacleCurl * radiusX * 0.18,
        y:
            Math.sin(latitude) * radiusY * (1 + upperBlend * 0.14) -
            upperBlend * radiusY * 0.12 +
            lowerDrop +
            Math.sin(timeMs / 1380 + animationPhase + latitude * 1.5) * lowerBlend * radiusY * 0.022 +
            Math.cos(timeMs / 820 + tentacleInfluence.primaryPhase) *
                lowerBlend *
                tipBlend *
                tentacleInfluence.core *
                radiusY *
                0.04,
        z:
            Math.cos(effectiveLongitude) * planarRadiusZ +
            Math.cos(timeMs / 960 + tentacleInfluence.primaryPhase + verticalProgress) *
                lowerBlend *
                tentacleInfluence.core *
                radiusZ *
                0.044 +
            tentacleCurl * radiusZ * 0.14,
    };
}

/**
 * Blends nearby seeded tentacle profiles at one mesh longitude.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function resolveBlobbyTentacleInfluence(
    options: BlobbyContinuousSurfaceOptions,
    longitude: number,
): BlobbyContinuousTentacleInfluence {
    let totalWeight = 0;
    let weightedSin = 0;
    let weightedCos = 0;
    let weightedWidthScale = 0;
    let weightedLengthScale = 0;
    let weightedSwayScale = 0;
    let weightedDepthScale = 0;
    let weightedCurlScale = 0;
    let weightedPrimaryPhase = 0;
    let weightedSecondaryPhase = 0;

    for (const tentacleProfile of options.tentacleProfiles) {
        const distance = Math.abs(resolveSignedAngularDistance(longitude, tentacleProfile.centerLongitude));
        const width = 0.22 * tentacleProfile.widthScale;
        const weight = Math.exp(-(distance * distance) / (width * width));

        totalWeight += weight;
        weightedSin += Math.sin(tentacleProfile.centerLongitude) * weight;
        weightedCos += Math.cos(tentacleProfile.centerLongitude) * weight;
        weightedWidthScale += tentacleProfile.widthScale * weight;
        weightedLengthScale += tentacleProfile.lengthScale * weight;
        weightedSwayScale += tentacleProfile.swayScale * weight;
        weightedDepthScale += tentacleProfile.depthScale * weight;
        weightedCurlScale += tentacleProfile.curlScale * weight;
        weightedPrimaryPhase += tentacleProfile.primaryPhase * weight;
        weightedSecondaryPhase += tentacleProfile.secondaryPhase * weight;
    }

    if (totalWeight < 0.0001) {
        return {
            core: 0,
            centerLongitude: longitude,
            widthScale: 1,
            lengthScale: 1,
            swayScale: 1,
            depthScale: 1,
            curlScale: 1,
            primaryPhase: 0,
            secondaryPhase: 0,
        };
    }

    return {
        core: clampNumber(totalWeight, 0, 1),
        centerLongitude: Math.atan2(weightedSin / totalWeight, weightedCos / totalWeight),
        widthScale: weightedWidthScale / totalWeight,
        lengthScale: weightedLengthScale / totalWeight,
        swayScale: weightedSwayScale / totalWeight,
        depthScale: weightedDepthScale / totalWeight,
        curlScale: weightedCurlScale / totalWeight,
        primaryPhase: weightedPrimaryPhase / totalWeight,
        secondaryPhase: weightedSecondaryPhase / totalWeight,
    };
}

/**
 * Resolves the soft lower wave that makes the continuous mesh read as a set of tentacles.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function resolveBlobbyLobeWave(options: BlobbyContinuousSurfaceOptions, longitude: number): number {
    const { morphologyProfile, animationPhase, timeMs } = options;

    return (
        (Math.cos(
            longitude * OCTOPUS_TENTACLE_COUNT +
                animationPhase +
                timeMs / (940 + morphologyProfile.body.lobeCount * 18),
        ) +
            1) /
        2
    );
}

/**
 * Resolves one base fill tone for a patch on the continuous octopus mesh.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function resolveBlobbySurfacePatchFillStyle(
    palette: AvatarPalette,
    verticalProgress: number,
    forwardness: number,
    tentacleCore: number,
    lowerLobeWave: number,
): string {
    const tonalProgress = clampNumber(
        verticalProgress + lowerLobeWave * 0.1 + tentacleCore * 0.08 - forwardness * 0.08,
        0,
        1,
    );

    if (tonalProgress < 0.12) {
        return palette.highlight;
    }
    if (tonalProgress < 0.3) {
        return palette.secondary;
    }
    if (tonalProgress < 0.72) {
        return forwardness > 0.56 ? palette.secondary : palette.primary;
    }

    return tentacleCore > 0.44 ? `${palette.primary}f4` : `${palette.shadow}ee`;
}

/**
 * Draws one projected mesh patch with multi-pass shading and a soft edge.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function drawBlobbyContinuousSurfacePatch(
    context: CanvasRenderingContext2D,
    surfacePatch: BlobbyContinuousSurfacePatch,
): void {
    drawProjectedQuad(context, surfacePatch.corners, surfacePatch.fillStyle);

    if (surfacePatch.lightIntensity > 0) {
        drawProjectedQuad(
            context,
            surfacePatch.corners,
            `rgba(255, 255, 255, ${0.2 * surfacePatch.lightIntensity})`,
        );
    } else if (surfacePatch.lightIntensity < 0) {
        drawProjectedQuad(
            context,
            surfacePatch.corners,
            `rgba(0, 0, 0, ${0.26 * Math.abs(surfacePatch.lightIntensity)})`,
        );
    }

    if (surfacePatch.rimLightIntensity > 0.04) {
        drawProjectedQuad(
            context,
            surfacePatch.corners,
            `rgba(255, 247, 230, ${0.22 * surfacePatch.rimLightIntensity})`,
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
    context.lineWidth = Math.max(0.6, getProjectedQuadPerimeter(surfacePatch.corners) * 0.0026);
    context.lineJoin = 'round';
    context.stroke();
    context.restore();
}

/**
 * Draws projected mantle-current lines on the front of the mesh.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function drawBlobbyContinuousCurrents(options: {
    readonly context: CanvasRenderingContext2D;
    readonly surfaceOptions: BlobbyContinuousSurfaceOptions;
    readonly center: Point3D;
    readonly rotationX: number;
    readonly rotationY: number;
    readonly sceneCenterX: number;
    readonly sceneCenterY: number;
    readonly size: number;
    readonly palette: AvatarPalette;
    readonly morphologyProfile: Octopus3MorphologyProfile;
    readonly timeMs: number;
    readonly animationPhase: number;
}): void {
    const {
        context,
        surfaceOptions,
        center,
        rotationX,
        rotationY,
        sceneCenterX,
        sceneCenterY,
        size,
        palette,
        morphologyProfile,
        timeMs,
        animationPhase,
    } = options;
    const currentCount = Math.min(6, morphologyProfile.details.mantleCurrentCount);
    const centerIndex = (currentCount - 1) / 2;

    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';

    for (let currentIndex = 0; currentIndex < currentCount; currentIndex++) {
        const baseLongitude = (currentIndex - centerIndex) * 0.15;
        const projectedPoints: Array<ProjectedPoint> = [];

        for (let sampleIndex = 0; sampleIndex < 9; sampleIndex++) {
            const progress = sampleIndex / 8;
            const latitude = -0.48 + progress * 0.78;
            const longitude =
                baseLongitude + Math.sin(timeMs / 1140 + animationPhase + currentIndex * 0.7 + progress * 2) * 0.038;
            const scenePoint = transformScenePoint(
                sampleBlobbyContinuousSurfacePoint(surfaceOptions, latitude, longitude),
                center,
                rotationX,
                rotationY,
            );

            if (scenePoint.z > center.z - size * 0.016) {
                projectedPoints.push(projectScenePoint(scenePoint, size, sceneCenterX, sceneCenterY));
            }
        }

        if (projectedPoints.length < 3) {
            continue;
        }

        context.beginPath();
        context.moveTo(projectedPoints[0]!.x, projectedPoints[0]!.y);
        for (const projectedPoint of projectedPoints.slice(1)) {
            context.lineTo(projectedPoint.x, projectedPoint.y);
        }
        context.strokeStyle = currentIndex % 2 === 0 ? `${palette.highlight}3d` : `${palette.accent}33`;
        context.lineWidth = size * (0.0055 + currentIndex * 0.00045);
        context.stroke();
    }

    context.restore();
}

/**
 * Draws small projected sucker highlights on the waving lower mesh lobes.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function drawBlobbyContinuousSuckers(options: {
    readonly context: CanvasRenderingContext2D;
    readonly surfaceOptions: BlobbyContinuousSurfaceOptions;
    readonly center: Point3D;
    readonly rotationX: number;
    readonly rotationY: number;
    readonly sceneCenterX: number;
    readonly sceneCenterY: number;
    readonly size: number;
    readonly palette: AvatarPalette;
}): void {
    const { surfaceOptions, size } = options;
    const { timeMs } = surfaceOptions;

    for (const tentacleProfile of surfaceOptions.tentacleProfiles) {
        if (Math.cos(tentacleProfile.centerLongitude) < -0.16) {
            continue;
        }

        for (let suckerIndex = 0; suckerIndex < 4; suckerIndex++) {
            const latitude = 0.5 + suckerIndex * 0.12;
            const sideOffset = tentacleProfile.suckerSide * (0.038 + suckerIndex * 0.014) * tentacleProfile.widthScale;
            const waveOffset = Math.sin(timeMs / 880 + tentacleProfile.primaryPhase + suckerIndex * 0.78) * 0.02;

            drawBlobbyContinuousSurfaceSpot({
                ...options,
                latitude,
                longitude: tentacleProfile.centerLongitude + sideOffset + waveOffset,
                radiusScale: size * (0.0068 - suckerIndex * 0.0006),
            });
        }
    }
}

/**
 * Draws seeded pigment spots across the upper mesh for a richer skin texture.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function drawBlobbySkinSpots(options: {
    readonly context: CanvasRenderingContext2D;
    readonly surfaceOptions: BlobbyContinuousSurfaceOptions;
    readonly center: Point3D;
    readonly rotationX: number;
    readonly rotationY: number;
    readonly sceneCenterX: number;
    readonly sceneCenterY: number;
    readonly size: number;
    readonly palette: AvatarPalette;
    readonly skinSpots: ReadonlyArray<BlobbySkinSpot>;
}): void {
    const {
        context,
        surfaceOptions,
        center,
        rotationX,
        rotationY,
        sceneCenterX,
        sceneCenterY,
        size,
        palette,
        skinSpots,
    } = options;

    for (const skinSpot of skinSpots) {
        const localCenter = sampleBlobbyContinuousSurfacePoint(surfaceOptions, skinSpot.latitude, skinSpot.longitude);
        const sceneCenterPoint = transformScenePoint(localCenter, center, rotationX, rotationY);

        if (sceneCenterPoint.z <= center.z - size * 0.01) {
            continue;
        }

        const projectedCenterPoint = projectScenePoint(sceneCenterPoint, size, sceneCenterX, sceneCenterY);
        const spotRadius = size * skinSpot.radiusScale;

        context.save();
        context.beginPath();
        context.arc(projectedCenterPoint.x, projectedCenterPoint.y, spotRadius, 0, Math.PI * 2);
        context.fillStyle = `${palette.shadow}${formatAlphaHex(skinSpot.opacity)}`;
        context.fill();
        context.restore();
    }
}

/**
 * Draws one tiny projected surface spot by sampling local mesh tangents.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function drawBlobbyContinuousSurfaceSpot(options: {
    readonly context: CanvasRenderingContext2D;
    readonly surfaceOptions: BlobbyContinuousSurfaceOptions;
    readonly center: Point3D;
    readonly rotationX: number;
    readonly rotationY: number;
    readonly sceneCenterX: number;
    readonly sceneCenterY: number;
    readonly size: number;
    readonly palette: AvatarPalette;
    readonly latitude: number;
    readonly longitude: number;
    readonly radiusScale: number;
}): void {
    const {
        context,
        surfaceOptions,
        center,
        rotationX,
        rotationY,
        sceneCenterX,
        sceneCenterY,
        size,
        palette,
        latitude,
        longitude,
        radiusScale,
    } = options;
    const localCenter = sampleBlobbyContinuousSurfacePoint(surfaceOptions, latitude, longitude);
    const localHorizontal = sampleBlobbyContinuousSurfacePoint(surfaceOptions, latitude, longitude + 0.018);
    const localVertical = sampleBlobbyContinuousSurfacePoint(surfaceOptions, latitude + 0.018, longitude);
    const sceneCenterPoint = transformScenePoint(localCenter, center, rotationX, rotationY);

    if (sceneCenterPoint.z <= center.z - size * 0.012) {
        return;
    }

    const projectedCenterPoint = projectScenePoint(sceneCenterPoint, size, sceneCenterX, sceneCenterY);
    const projectedHorizontalPoint = projectScenePoint(
        transformScenePoint(localHorizontal, center, rotationX, rotationY),
        size,
        sceneCenterX,
        sceneCenterY,
    );
    const projectedVerticalPoint = projectScenePoint(
        transformScenePoint(localVertical, center, rotationX, rotationY),
        size,
        sceneCenterX,
        sceneCenterY,
    );
    const horizontalRadius = clampNumber(
        Math.hypot(
            projectedHorizontalPoint.x - projectedCenterPoint.x,
            projectedHorizontalPoint.y - projectedCenterPoint.y,
        ) *
            radiusScale *
            0.78,
        size * 0.003,
        size * 0.02,
    );
    const verticalRadius = clampNumber(
        Math.hypot(
            projectedVerticalPoint.x - projectedCenterPoint.x,
            projectedVerticalPoint.y - projectedCenterPoint.y,
        ) *
            radiusScale *
            0.54,
        size * 0.0024,
        size * 0.015,
    );
    const rotation = Math.atan2(
        projectedHorizontalPoint.y - projectedCenterPoint.y,
        projectedHorizontalPoint.x - projectedCenterPoint.x,
    );

    context.save();
    context.translate(projectedCenterPoint.x, projectedCenterPoint.y);
    context.rotate(rotation);
    context.beginPath();
    context.ellipse(0, 0, horizontalRadius, verticalRadius, 0, 0, Math.PI * 2);
    context.fillStyle = `${palette.highlight}80`;
    context.fill();
    context.strokeStyle = `${palette.highlight}a8`;
    context.lineWidth = Math.max(0.7, size * 0.0028);
    context.stroke();
    context.restore();
}

/**
 * Draws a soft, slowly drifting gloss highlight on the front of the mesh.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function drawBlobbyContinuousGloss(options: {
    readonly context: CanvasRenderingContext2D;
    readonly surfaceOptions: BlobbyContinuousSurfaceOptions;
    readonly center: Point3D;
    readonly rotationX: number;
    readonly rotationY: number;
    readonly sceneCenterX: number;
    readonly sceneCenterY: number;
    readonly size: number;
    readonly palette: AvatarPalette;
}): void {
    const { context, surfaceOptions, center, rotationX, rotationY, sceneCenterX, sceneCenterY, size } = options;
    const { timeMs, animationPhase } = surfaceOptions;
    const glossLatitude = -0.3 + Math.sin(timeMs / 2700 + animationPhase) * 0.04;
    const glossLongitude = -0.18 + Math.cos(timeMs / 2300 + animationPhase * 0.8) * 0.05;
    const localCenter = sampleBlobbyContinuousSurfacePoint(surfaceOptions, glossLatitude, glossLongitude);
    const sceneCenterPoint = transformScenePoint(localCenter, center, rotationX, rotationY);

    if (sceneCenterPoint.z <= center.z) {
        return;
    }

    const projectedCenterPoint = projectScenePoint(sceneCenterPoint, size, sceneCenterX, sceneCenterY);
    const glossRadius = size * 0.058;

    context.save();
    const glossGradient = context.createRadialGradient(
        projectedCenterPoint.x - glossRadius * 0.3,
        projectedCenterPoint.y - glossRadius * 0.4,
        glossRadius * 0.04,
        projectedCenterPoint.x,
        projectedCenterPoint.y,
        glossRadius,
    );
    glossGradient.addColorStop(0, 'rgba(255, 255, 255, 0.34)');
    glossGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    glossGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = glossGradient;
    context.beginPath();
    context.ellipse(
        projectedCenterPoint.x,
        projectedCenterPoint.y,
        glossRadius * 1.05,
        glossRadius * 0.78,
        0,
        0,
        Math.PI * 2,
    );
    context.fill();
    context.restore();
}

/**
 * Resolves a signed angular distance from the source longitude to the target longitude.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function resolveSignedAngularDistance(sourceLongitude: number, targetLongitude: number): number {
    return Math.atan2(Math.sin(targetLongitude - sourceLongitude), Math.cos(targetLongitude - sourceLongitude));
}

/**
 * Smoothly maps a value between two bounds into `[0, 1]`.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function smoothStep(edgeStart: number, edgeEnd: number, value: number): number {
    const progress = clampNumber((value - edgeStart) / (edgeEnd - edgeStart), 0, 1);

    return progress * progress * (3 - 2 * progress);
}

/**
 * Converts an opacity ratio into a two-digit hexadecimal alpha suffix.
 *
 * @private helper of `octopus3d4AvatarVisual`
 */
function formatAlphaHex(opacity: number): string {
    return Math.round(clampNumber(opacity, 0, 1) * 255)
        .toString(16)
        .padStart(2, '0');
}
