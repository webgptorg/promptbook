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
 * One visible projected patch on the continuous Octopus 3D 3 mesh.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
type ContinuousOctopusSurfacePatch = {
    readonly corners: [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];
    readonly averageDepth: number;
    readonly lightIntensity: number;
    readonly fillStyle: string;
    readonly outlineColor: string;
};

/**
 * Seeded profile for one continuous lower mesh lobe that reads as a tentacle.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
type ContinuousOctopusTentacleProfile = {
    readonly centerLongitude: number;
    readonly widthScale: number;
    readonly lengthScale: number;
    readonly swayScale: number;
    readonly depthScale: number;
    readonly phase: number;
    readonly suckerSide: -1 | 1;
};

/**
 * Stable surface options used by the continuous Octopus 3D 3 mesh sampler.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
type ContinuousOctopusSurfaceOptions = {
    readonly radiusX: number;
    readonly radiusY: number;
    readonly radiusZ: number;
    readonly morphologyProfile: Octopus3MorphologyProfile;
    readonly timeMs: number;
    readonly animationPhase: number;
    readonly tentacleProfiles: ReadonlyArray<ContinuousOctopusTentacleProfile>;
};

/**
 * Smoothly blended influence of nearby tentacle lobes at one longitude.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
type ContinuousOctopusTentacleInfluence = {
    readonly core: number;
    readonly centerLongitude: number;
    readonly widthScale: number;
    readonly lengthScale: number;
    readonly swayScale: number;
    readonly depthScale: number;
    readonly phase: number;
};

/**
 * Light direction used by the continuous octopus mesh shading.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
const LIGHT_DIRECTION: Point3D = normalizeVector3({
    x: 0.34,
    y: -0.62,
    z: 1,
});

/**
 * Real-octopus tentacle count used by the continuous lower mesh.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
const OCTOPUS_TENTACLE_COUNT = 8;

/**
 * Octopus 3D 3 avatar visual.
 *
 * @private built-in avatar visual
 */
export const octopus3d3AvatarVisual: AvatarVisualDefinition = {
    id: 'octopus3d3',
    title: 'Octopus 3D 3',
    description:
        'Cute continuous 3D octopus with a blobby single mesh, waving tentacle lobes, rich shading, and cursor-aware eyes.',
    isAnimated: true,
    supportsPointerTracking: true,
    render({ context, size, palette, createRandom, timeMs, interaction }) {
        const morphologyProfile = createOctopus3MorphologyProfile(createRandom);
        const animationRandom = createRandom('octopus3d3-animation-profile');
        const eyeRandom = createRandom('octopus3d3-eye-profile');
        const animationPhase = animationRandom() * Math.PI * 2;
        const tentacleProfiles = createContinuousTentacleProfiles(createRandom, morphologyProfile);
        const sceneCenterX = size * 0.5;
        const sceneCenterY = size * 0.535;
        const bob = Math.sin(timeMs / 960 + animationPhase) * size * 0.012;
        const meshCenter: Point3D = {
            x: interaction.bodyOffsetX * size * 0.048 + size * morphologyProfile.body.centerXJitterRatio * 0.44,
            y: -size * 0.07 + interaction.bodyOffsetY * size * 0.026 + bob,
            z: interaction.intensity * size * 0.018,
        };
        const rotationY =
            -0.1 +
            Math.sin(timeMs / 2700 + animationPhase) * 0.035 +
            interaction.bodyOffsetX * 0.22 +
            interaction.gazeX * 0.88;
        const rotationX =
            -0.07 +
            Math.cos(timeMs / 3100 + animationPhase * 0.7) * 0.018 -
            interaction.bodyOffsetY * 0.08 -
            interaction.gazeY * 0.38;
        const surfaceOptions: ContinuousOctopusSurfaceOptions = {
            radiusX: size * morphologyProfile.body.bodyRadiusRatio * morphologyProfile.body.horizontalStretch * 1.1,
            radiusY: size * morphologyProfile.body.bodyRadiusRatio * morphologyProfile.body.verticalStretch * 1.08,
            radiusZ:
                size *
                morphologyProfile.body.bodyRadiusRatio *
                (1.02 + (morphologyProfile.body.horizontalStretch - 1) * 0.18),
            morphologyProfile,
            timeMs,
            animationPhase,
            tentacleProfiles,
        };
        const surfacePatches = resolveVisibleContinuousOctopusPatches({
            ...surfaceOptions,
            center: meshCenter,
            rotationX,
            rotationY,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
        });
        const eyeLatitude = clampNumber(morphologyProfile.face.eyeCenterYOffsetRatio * 4.2 - 0.03, -0.22, 0.08);
        const eyeLongitude = clampNumber(morphologyProfile.face.eyeSpacingRatio * 3.1, 0.18, 0.32);
        const mouthLatitude = clampNumber(eyeLatitude + 0.2 + morphologyProfile.face.mouthYOffsetRatio, 0.08, 0.34);
        const mouthCenterLongitude = clampNumber(morphologyProfile.face.mouthCenterOffsetRatio * 5.6, -0.08, 0.08);
        const mouthHalfLongitude = clampNumber(eyeLongitude * 0.78, 0.15, 0.28);
        const mouthCurveLatitude = clampNumber(
            mouthLatitude + morphologyProfile.face.mouthCurveDepthRatio * 0.78,
            mouthLatitude + 0.03,
            0.42,
        );
        const eyeRadiusX = size * morphologyProfile.face.eyeRadiusXRatio * 0.76;
        const eyeRadiusY = eyeRadiusX * morphologyProfile.face.eyeHeightRatio * 0.9;

        drawAvatarFrame(context, size, palette);
        drawContinuousOctopusAtmosphere(context, size, palette, sceneCenterX, sceneCenterY, interaction, timeMs);
        drawContinuousOctopusShadow(context, size, palette, interaction, timeMs, morphologyProfile);

        for (const surfacePatch of surfacePatches.sort(
            (firstSurfacePatch, secondSurfacePatch) => firstSurfacePatch.averageDepth - secondSurfacePatch.averageDepth,
        )) {
            drawContinuousSurfacePatch(context, surfacePatch);
        }

        drawProjectedSurfaceCurrents({
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
        drawProjectedTentacleSuckers({
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
            sampleContinuousOctopusSurfacePoint(surfaceOptions, eyeLatitude, -eyeLongitude),
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
            sampleContinuousOctopusSurfacePoint(surfaceOptions, eyeLatitude, eyeLongitude),
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
            animationPhase + 0.85 + eyeRandom() * 0.7,
            interaction,
            morphologyProfile.face.eyeStyle,
        );

        drawProjectedOrganicMouth(
            context,
            [
                sampleContinuousOctopusSurfacePoint(
                    surfaceOptions,
                    mouthLatitude,
                    mouthCenterLongitude - mouthHalfLongitude,
                ),
                sampleContinuousOctopusSurfacePoint(surfaceOptions, mouthCurveLatitude, mouthCenterLongitude),
                sampleContinuousOctopusSurfacePoint(
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
 * @private helper of `octopus3d3AvatarVisual`
 */
function createContinuousTentacleProfiles(
    createRandom: (salt: string) => () => number,
    morphologyProfile: Octopus3MorphologyProfile,
): ReadonlyArray<ContinuousOctopusTentacleProfile> {
    return Array.from({ length: OCTOPUS_TENTACLE_COUNT }, (_, tentacleIndex) => {
        const tentacleRandom = createRandom(`octopus3d3-tentacle-${tentacleIndex}`);
        const progress = tentacleIndex / (OCTOPUS_TENTACLE_COUNT - 1);

        return {
            centerLongitude:
                -Math.PI * 0.86 +
                progress * Math.PI * 1.72 +
                (tentacleRandom() - 0.5) * (0.08 + morphologyProfile.tentacles.rootSpreadScale * 0.03),
            widthScale: 0.86 + tentacleRandom() * 0.34 + (morphologyProfile.tentacles.baseWidthScale - 1) * 0.16,
            lengthScale: 0.86 + tentacleRandom() * 0.36 + (morphologyProfile.tentacles.flowLengthScale - 1) * 0.22,
            swayScale: 0.82 + tentacleRandom() * 0.38 + (morphologyProfile.tentacles.swayScale - 1) * 0.2,
            depthScale: 0.86 + tentacleRandom() * 0.32 + (morphologyProfile.tentacles.tipReachScale - 1) * 0.2,
            phase: tentacleRandom() * Math.PI * 2,
            suckerSide: tentacleRandom() > 0.5 ? 1 : -1,
        };
    });
}

/**
 * Draws the soft underwater atmosphere behind the continuous octopus mesh.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
function drawContinuousOctopusAtmosphere(
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
        size * 0.04,
        sceneCenterX,
        sceneCenterY,
        size * (0.66 + interaction.intensity * 0.02),
    );
    glowGradient.addColorStop(0, `${palette.highlight}66`);
    glowGradient.addColorStop(0.34, `${palette.accent}2e`);
    glowGradient.addColorStop(1, `${palette.highlight}00`);
    context.fillStyle = glowGradient;
    context.fillRect(0, 0, size, size);

    const lowerGradient = context.createRadialGradient(
        sceneCenterX + Math.sin(timeMs / 1550) * size * 0.05,
        sceneCenterY + size * 0.29,
        size * 0.06,
        sceneCenterX,
        sceneCenterY + size * 0.3,
        size * 0.54,
    );
    lowerGradient.addColorStop(0, `${palette.secondary}25`);
    lowerGradient.addColorStop(1, `${palette.secondary}00`);
    context.fillStyle = lowerGradient;
    context.fillRect(0, 0, size, size);
}

/**
 * Draws the soft lower shadow that anchors the octopus in the avatar frame.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
function drawContinuousOctopusShadow(
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
    context.filter = `blur(${size * 0.025}px)`;
    context.beginPath();
    context.ellipse(
        size * 0.5 + interaction.gazeX * size * 0.045,
        size * 0.9 + Math.sin(timeMs / 980) * size * 0.007,
        size * (0.19 + morphologyProfile.tentacles.rootSpreadScale * 0.022 + interaction.intensity * 0.02),
        size * 0.06,
        0,
        0,
        Math.PI * 2,
    );
    context.fill();
    context.restore();
}

/**
 * Resolves visible projected patches for the continuous octopus mesh.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
function resolveVisibleContinuousOctopusPatches(
    options: ContinuousOctopusSurfaceOptions & {
        readonly center: Point3D;
        readonly rotationX: number;
        readonly rotationY: number;
        readonly sceneCenterX: number;
        readonly sceneCenterY: number;
        readonly size: number;
        readonly palette: AvatarPalette;
    },
): Array<ContinuousOctopusSurfacePatch> {
    const { center, rotationX, rotationY, sceneCenterX, sceneCenterY, size, palette } = options;
    const latitudePatchCount = 16;
    const longitudePatchCount = 40;
    const surfacePatches: Array<ContinuousOctopusSurfacePatch> = [];

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
                sampleContinuousOctopusSurfacePoint(options, startLatitude, startLongitude),
                sampleContinuousOctopusSurfacePoint(options, startLatitude, endLongitude),
                sampleContinuousOctopusSurfacePoint(options, endLatitude, endLongitude),
                sampleContinuousOctopusSurfacePoint(options, endLatitude, startLongitude),
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

            if (surfaceNormal.z <= 0.008) {
                continue;
            }

            const projectedCorners = transformedCorners.map((transformedCorner) =>
                projectScenePoint(transformedCorner, size, sceneCenterX, sceneCenterY),
            ) as [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];
            const tentacleInfluence = resolveContinuousTentacleInfluence(options, centerLongitude);
            const lowerLobeWave = resolveContinuousLobeWave(options, centerLongitude);

            surfacePatches.push({
                corners: projectedCorners,
                averageDepth:
                    transformedCorners.reduce((depthSum, transformedCorner) => depthSum + transformedCorner.z, 0) /
                    transformedCorners.length,
                lightIntensity: clampNumber(dotProduct3D(surfaceNormal, LIGHT_DIRECTION), -1, 1),
                fillStyle: resolveContinuousSurfacePatchFillStyle(
                    palette,
                    verticalProgress,
                    Math.max(0, Math.cos(centerLongitude)),
                    tentacleInfluence.core,
                    lowerLobeWave,
                ),
                outlineColor: verticalProgress < 0.54 ? `${palette.highlight}69` : `${palette.shadow}78`,
            });
        }
    }

    return surfacePatches;
}

/**
 * Samples one point on the continuous Octopus 3D 3 surface.
 *
 * The lower hemisphere is pulled into eight seeded waving lobes, so the portrait reads as
 * tentacled while still being rendered as one connected blobby mesh.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
function sampleContinuousOctopusSurfacePoint(
    options: ContinuousOctopusSurfaceOptions,
    latitude: number,
    longitude: number,
): Point3D {
    const { radiusX, radiusY, radiusZ, morphologyProfile, timeMs, animationPhase } = options;
    const cosineLatitude = Math.max(0, Math.cos(latitude));
    const verticalProgress = (Math.sin(latitude) + 1) / 2;
    const upperBlend = Math.pow(1 - verticalProgress, 1.28);
    const lowerBlend = smoothStep(0.38, 1, verticalProgress);
    const tipBlend = smoothStep(0.68, 1, verticalProgress);
    const tentacleInfluence = resolveContinuousTentacleInfluence(options, longitude);
    const centerPull = resolveSignedAngularDistance(longitude, tentacleInfluence.centerLongitude);
    const effectiveLongitude = longitude + centerPull * lowerBlend * tentacleInfluence.core * (0.24 + tipBlend * 0.2);
    const lowerLobeWave = resolveContinuousLobeWave(options, longitude);
    const mantleRipple =
        Math.sin(
            longitude * morphologyProfile.body.lobeCount +
                animationPhase * 0.6 +
                timeMs / (1750 + morphologyProfile.body.lobeCount * 30),
        ) *
        (0.018 + morphologyProfile.body.wobbleAmplitudeRatio * 0.8) *
        (0.3 + lowerBlend * 0.7);
    const tentacleWave =
        Math.sin(timeMs / 760 + tentacleInfluence.phase + verticalProgress * 2.4) *
        lowerBlend *
        tentacleInfluence.core *
        tentacleInfluence.swayScale;
    const horizontalScale =
        1.04 +
        mantleRipple +
        lowerBlend * (0.16 + (morphologyProfile.tentacles.rootSpreadScale - 1) * 0.1) +
        lowerBlend * tentacleInfluence.core * (0.2 + lowerLobeWave * 0.12) -
        upperBlend * 0.08;
    const depthScale =
        1.06 +
        upperBlend * 0.16 +
        Math.max(0, Math.cos(effectiveLongitude)) * 0.1 +
        lowerBlend * tentacleInfluence.core * (0.1 + tentacleInfluence.depthScale * 0.06) -
        Math.max(0, -Math.cos(effectiveLongitude)) * 0.05;
    const tentacleTubeRadius =
        lowerBlend * tentacleInfluence.core * (0.11 + tipBlend * 0.06 + tentacleInfluence.widthScale * 0.025) * radiusX;
    const planarRadiusX = cosineLatitude * radiusX * horizontalScale + tentacleTubeRadius;
    const planarRadiusZ = cosineLatitude * radiusZ * depthScale + tentacleTubeRadius * 0.72;
    const lowerDrop =
        lowerBlend *
        radiusY *
        (0.18 +
            tentacleInfluence.core *
                (0.38 +
                    tentacleInfluence.lengthScale * 0.22 +
                    (morphologyProfile.tentacles.flowLengthScale - 1) * 0.08));

    return {
        x: Math.sin(effectiveLongitude) * planarRadiusX + tentacleWave * radiusX * (0.052 + tipBlend * 0.05),
        y:
            Math.sin(latitude) * radiusY * (1 + upperBlend * 0.12) -
            upperBlend * radiusY * 0.1 +
            lowerDrop +
            Math.sin(timeMs / 1420 + animationPhase + latitude * 1.6) * lowerBlend * radiusY * 0.018 +
            Math.cos(timeMs / 880 + tentacleInfluence.phase) *
                lowerBlend *
                tipBlend *
                tentacleInfluence.core *
                radiusY *
                0.034,
        z:
            Math.cos(effectiveLongitude) * planarRadiusZ +
            Math.cos(timeMs / 980 + tentacleInfluence.phase + verticalProgress) *
                lowerBlend *
                tentacleInfluence.core *
                radiusZ *
                0.04,
    };
}

/**
 * Blends nearby seeded tentacle profiles at one mesh longitude.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
function resolveContinuousTentacleInfluence(
    options: ContinuousOctopusSurfaceOptions,
    longitude: number,
): ContinuousOctopusTentacleInfluence {
    let totalWeight = 0;
    let weightedSin = 0;
    let weightedCos = 0;
    let weightedWidthScale = 0;
    let weightedLengthScale = 0;
    let weightedSwayScale = 0;
    let weightedDepthScale = 0;
    let weightedPhase = 0;

    for (const tentacleProfile of options.tentacleProfiles) {
        const distance = Math.abs(resolveSignedAngularDistance(longitude, tentacleProfile.centerLongitude));
        const width = 0.2 * tentacleProfile.widthScale;
        const weight = Math.exp(-(distance * distance) / (width * width));

        totalWeight += weight;
        weightedSin += Math.sin(tentacleProfile.centerLongitude) * weight;
        weightedCos += Math.cos(tentacleProfile.centerLongitude) * weight;
        weightedWidthScale += tentacleProfile.widthScale * weight;
        weightedLengthScale += tentacleProfile.lengthScale * weight;
        weightedSwayScale += tentacleProfile.swayScale * weight;
        weightedDepthScale += tentacleProfile.depthScale * weight;
        weightedPhase += tentacleProfile.phase * weight;
    }

    if (totalWeight < 0.0001) {
        return {
            core: 0,
            centerLongitude: longitude,
            widthScale: 1,
            lengthScale: 1,
            swayScale: 1,
            depthScale: 1,
            phase: 0,
        };
    }

    return {
        core: clampNumber(totalWeight, 0, 1),
        centerLongitude: Math.atan2(weightedSin / totalWeight, weightedCos / totalWeight),
        widthScale: weightedWidthScale / totalWeight,
        lengthScale: weightedLengthScale / totalWeight,
        swayScale: weightedSwayScale / totalWeight,
        depthScale: weightedDepthScale / totalWeight,
        phase: weightedPhase / totalWeight,
    };
}

/**
 * Resolves the soft lower wave that makes the continuous mesh read as a set of tentacles.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
function resolveContinuousLobeWave(options: ContinuousOctopusSurfaceOptions, longitude: number): number {
    const { morphologyProfile, animationPhase, timeMs } = options;

    return (
        (Math.cos(
            longitude * OCTOPUS_TENTACLE_COUNT +
                animationPhase +
                timeMs / (980 + morphologyProfile.body.lobeCount * 18),
        ) +
            1) /
        2
    );
}

/**
 * Resolves one base fill tone for a patch on the continuous octopus mesh.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
function resolveContinuousSurfacePatchFillStyle(
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

    if (tonalProgress < 0.14) {
        return palette.highlight;
    }
    if (tonalProgress < 0.32) {
        return palette.secondary;
    }
    if (tonalProgress < 0.72) {
        return forwardness > 0.55 ? palette.secondary : palette.primary;
    }

    return tentacleCore > 0.44 ? `${palette.primary}f4` : `${palette.shadow}ee`;
}

/**
 * Draws one projected mesh patch with soft shading and a subtle edge.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
function drawContinuousSurfacePatch(
    context: CanvasRenderingContext2D,
    surfacePatch: ContinuousOctopusSurfacePatch,
): void {
    drawProjectedQuad(context, surfacePatch.corners, surfacePatch.fillStyle);

    if (surfacePatch.lightIntensity > 0) {
        drawProjectedQuad(context, surfacePatch.corners, `rgba(255, 255, 255, ${0.18 * surfacePatch.lightIntensity})`);
    } else if (surfacePatch.lightIntensity < 0) {
        drawProjectedQuad(
            context,
            surfacePatch.corners,
            `rgba(0, 0, 0, ${0.25 * Math.abs(surfacePatch.lightIntensity)})`,
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
    context.lineWidth = Math.max(0.7, getProjectedQuadPerimeter(surfacePatch.corners) * 0.0032);
    context.lineJoin = 'round';
    context.stroke();
    context.restore();
}

/**
 * Draws projected mantle-current lines on the front of the mesh.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
function drawProjectedSurfaceCurrents(options: {
    readonly context: CanvasRenderingContext2D;
    readonly surfaceOptions: ContinuousOctopusSurfaceOptions;
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

        for (let sampleIndex = 0; sampleIndex < 8; sampleIndex++) {
            const progress = sampleIndex / 7;
            const latitude = -0.46 + progress * 0.74;
            const longitude =
                baseLongitude + Math.sin(timeMs / 1160 + animationPhase + currentIndex * 0.7 + progress * 2) * 0.035;
            const scenePoint = transformScenePoint(
                sampleContinuousOctopusSurfacePoint(surfaceOptions, latitude, longitude),
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
 * @private helper of `octopus3d3AvatarVisual`
 */
function drawProjectedTentacleSuckers(options: {
    readonly context: CanvasRenderingContext2D;
    readonly surfaceOptions: ContinuousOctopusSurfaceOptions;
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
        if (Math.cos(tentacleProfile.centerLongitude) < -0.12) {
            continue;
        }

        for (let suckerIndex = 0; suckerIndex < 3; suckerIndex++) {
            const latitude = 0.52 + suckerIndex * 0.14;
            const sideOffset = tentacleProfile.suckerSide * (0.035 + suckerIndex * 0.012) * tentacleProfile.widthScale;
            const waveOffset = Math.sin(timeMs / 900 + tentacleProfile.phase + suckerIndex * 0.8) * 0.018;

            drawProjectedSurfaceSpot({
                ...options,
                latitude,
                longitude: tentacleProfile.centerLongitude + sideOffset + waveOffset,
                radiusScale: size * (0.0065 - suckerIndex * 0.0007),
            });
        }
    }
}

/**
 * Draws one tiny projected surface spot by sampling local mesh tangents.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
function drawProjectedSurfaceSpot(options: {
    readonly context: CanvasRenderingContext2D;
    readonly surfaceOptions: ContinuousOctopusSurfaceOptions;
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
    const localCenter = sampleContinuousOctopusSurfacePoint(surfaceOptions, latitude, longitude);
    const localHorizontal = sampleContinuousOctopusSurfacePoint(surfaceOptions, latitude, longitude + 0.018);
    const localVertical = sampleContinuousOctopusSurfacePoint(surfaceOptions, latitude + 0.018, longitude);
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
            0.74,
        size * 0.003,
        size * 0.018,
    );
    const verticalRadius = clampNumber(
        Math.hypot(
            projectedVerticalPoint.x - projectedCenterPoint.x,
            projectedVerticalPoint.y - projectedCenterPoint.y,
        ) *
            radiusScale *
            0.52,
        size * 0.0024,
        size * 0.014,
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
    context.fillStyle = `${palette.highlight}73`;
    context.fill();
    context.strokeStyle = `${palette.highlight}99`;
    context.lineWidth = Math.max(0.7, size * 0.0028);
    context.stroke();
    context.restore();
}

/**
 * Resolves a signed angular distance from the source longitude to the target longitude.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
function resolveSignedAngularDistance(sourceLongitude: number, targetLongitude: number): number {
    return Math.atan2(Math.sin(targetLongitude - sourceLongitude), Math.cos(targetLongitude - sourceLongitude));
}

/**
 * Smoothly maps a value between two bounds into `[0, 1]`.
 *
 * @private helper of `octopus3d3AvatarVisual`
 */
function smoothStep(edgeStart: number, edgeEnd: number, value: number): number {
    const progress = clampNumber((value - edgeStart) / (edgeEnd - edgeStart), 0, 1);

    return progress * progress * (3 - 2 * progress);
}
