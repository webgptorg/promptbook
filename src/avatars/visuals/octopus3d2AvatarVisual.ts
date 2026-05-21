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
 * Latitudinal mesh resolution for the continuous blobby octopus surface.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
const BLOBBY_MESH_LATITUDE_PATCH_COUNT = 16;

/**
 * Longitudinal mesh resolution for the continuous blobby octopus surface.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
const BLOBBY_MESH_LONGITUDE_PATCH_COUNT = 30;

/**
 * Light direction used by the continuous blobby octopus mesh.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
const BLOBBY_LIGHT_DIRECTION: Point3D = normalizeVector3({
    x: 0.38,
    y: -0.66,
    z: 0.96,
});

/**
 * Derived mesh profile for the continuous `Octopus 3D 2` body.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
type BlobbyOctopusMeshProfile = {
    readonly size: number;
    readonly radiusX: number;
    readonly radiusY: number;
    readonly radiusZ: number;
    readonly mantleLift: number;
    readonly lowerDrop: number;
    readonly lobeCount: number;
    readonly lobeAmplitude: number;
    readonly skirtInflation: number;
    readonly wobbleAmplitude: number;
    readonly shapePhase: number;
    readonly timeMs: number;
};

/**
 * Options for resolving a continuous blobby octopus mesh.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
type ResolveBlobbyOctopusMeshPatchesOptions = {
    readonly profile: BlobbyOctopusMeshProfile;
    readonly center: Point3D;
    readonly rotationX: number;
    readonly rotationY: number;
    readonly sceneCenterX: number;
    readonly sceneCenterY: number;
    readonly palette: AvatarPalette;
};

/**
 * Octopus 3D 2 avatar visual.
 *
 * @private built-in avatar visual
 */
export const octopus3d2AvatarVisual: AvatarVisualDefinition = {
    id: 'octopus3d2',
    title: 'Octopus 3D 2',
    description: 'Cute continuous one-mesh 3D octopus with a blobby real-octopus silhouette and pointer-aware face.',
    isAnimated: true,
    supportsPointerTracking: true,
    render({ context, size, palette, createRandom, timeMs, interaction }) {
        const morphologyProfile = createOctopus3MorphologyProfile(createRandom);
        const animationRandom = createRandom('octopus3d2-animation-profile');
        const eyeRandom = createRandom('octopus3d2-eye-profile');
        const shapePhase = animationRandom() * Math.PI * 2;
        const sceneCenterX = size * 0.5;
        const sceneCenterY = size * 0.55;
        const bob = Math.sin(timeMs / 980 + shapePhase) * size * 0.012;
        const meshCenter: Point3D = {
            x: interaction.bodyOffsetX * size * 0.034 + size * morphologyProfile.body.centerXJitterRatio * 0.46,
            y: -size * 0.08 + interaction.bodyOffsetY * size * 0.024 + bob,
            z: interaction.intensity * size * 0.018,
        };
        const meshProfile = createBlobbyOctopusMeshProfile(morphologyProfile, size, shapePhase, timeMs);
        const meshYaw =
            -0.1 +
            Math.sin(timeMs / 2500 + shapePhase) * 0.045 +
            interaction.bodyOffsetX * 0.16 +
            interaction.gazeX * 0.54;
        const meshPitch =
            -0.06 +
            Math.cos(timeMs / 2800 + shapePhase * 0.7) * 0.024 -
            interaction.bodyOffsetY * 0.08 -
            interaction.gazeY * 0.3;
        const surfacePatches = resolveVisibleBlobbyOctopusMeshPatches({
            profile: meshProfile,
            center: meshCenter,
            rotationX: meshPitch,
            rotationY: meshYaw,
            sceneCenterX,
            sceneCenterY,
            palette,
        }).sort(
            (firstSurfacePatch, secondSurfacePatch) => firstSurfacePatch.averageDepth - secondSurfacePatch.averageDepth,
        );
        const faceEyeSpacing = size * morphologyProfile.face.eyeSpacingRatio * 0.84;
        const faceEyeYOffset = -meshProfile.radiusY * 0.26 + size * morphologyProfile.face.eyeCenterYOffsetRatio * 0.64;
        const faceEyeRadiusX = size * morphologyProfile.face.eyeRadiusXRatio * 0.72;
        const faceEyeRadiusY = faceEyeRadiusX * morphologyProfile.face.eyeHeightRatio * 0.92;
        const mouthHalfWidth = size * morphologyProfile.face.mouthWidthRatio * 0.82;
        const mouthY =
            faceEyeYOffset + size * morphologyProfile.face.mouthYOffsetRatio * 0.58 + meshProfile.radiusY * 0.13;

        drawAvatarFrame(context, size, palette);
        drawOctopus3d2Atmosphere(context, size, palette, sceneCenterX, sceneCenterY, interaction, timeMs, shapePhase);
        drawOctopus3d2Shadow(context, size, palette, interaction, timeMs);

        for (const surfacePatch of surfacePatches) {
            drawOctopus3dSurfacePatch(context, surfacePatch);
        }

        drawProjectedOctopusEye(
            context,
            {
                x: -faceEyeSpacing,
                y: faceEyeYOffset,
                z: resolveBlobbyOctopusFaceSurfaceDepth(meshProfile, -faceEyeSpacing, faceEyeYOffset),
            },
            faceEyeRadiusX,
            faceEyeRadiusY,
            meshCenter,
            meshPitch,
            meshYaw,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
            timeMs,
            shapePhase + eyeRandom() * 0.64,
            interaction,
            morphologyProfile.face.eyeStyle,
        );
        drawProjectedOctopusEye(
            context,
            {
                x: faceEyeSpacing,
                y: faceEyeYOffset,
                z: resolveBlobbyOctopusFaceSurfaceDepth(meshProfile, faceEyeSpacing, faceEyeYOffset),
            },
            faceEyeRadiusX,
            faceEyeRadiusY,
            meshCenter,
            meshPitch,
            meshYaw,
            sceneCenterX,
            sceneCenterY,
            size,
            palette,
            timeMs,
            shapePhase + 0.72 + eyeRandom() * 0.64,
            interaction,
            morphologyProfile.face.eyeStyle,
        );

        drawProjectedOctopusMouth(
            context,
            [
                {
                    x: -mouthHalfWidth,
                    y: mouthY,
                    z: resolveBlobbyOctopusFaceSurfaceDepth(meshProfile, -mouthHalfWidth, mouthY),
                },
                {
                    x: size * morphologyProfile.face.mouthCenterOffsetRatio * 0.82,
                    y:
                        mouthY +
                        size * morphologyProfile.face.mouthCurveDepthRatio * 0.34 +
                        Math.sin(timeMs / 780 + shapePhase) * size * 0.008 +
                        interaction.gazeY * size * 0.009,
                    z: resolveBlobbyOctopusFaceSurfaceDepth(
                        meshProfile,
                        size * morphologyProfile.face.mouthCenterOffsetRatio * 0.82,
                        mouthY,
                    ),
                },
                {
                    x: mouthHalfWidth,
                    y: mouthY,
                    z: resolveBlobbyOctopusFaceSurfaceDepth(meshProfile, mouthHalfWidth, mouthY),
                },
            ],
            meshCenter,
            meshPitch,
            meshYaw,
            sceneCenterX,
            sceneCenterY,
            palette,
            size,
        );
    },
};

/**
 * Builds the deterministic one-mesh profile from the shared Octopus3 morphology.
 *
 * @param morphologyProfile Shared octopus-family morphology profile.
 * @param size Canvas size in CSS pixels.
 * @param shapePhase Seed-based shape phase.
 * @param timeMs Current animation time in milliseconds.
 * @returns Continuous blobby mesh profile.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function createBlobbyOctopusMeshProfile(
    morphologyProfile: Octopus3MorphologyProfile,
    size: number,
    shapePhase: number,
    timeMs: number,
): BlobbyOctopusMeshProfile {
    const baseRadius = size * morphologyProfile.body.bodyRadiusRatio;

    return {
        size,
        radiusX:
            baseRadius *
            (1.12 +
                (morphologyProfile.body.horizontalStretch - 1) * 0.28 +
                (morphologyProfile.tentacles.rootSpreadScale - 1) * 0.09),
        radiusY:
            baseRadius *
            (1.34 + (morphologyProfile.body.verticalStretch - 1) * 0.34 + morphologyProfile.body.lowerDropRatio * 1.1),
        radiusZ: baseRadius * (0.98 + (morphologyProfile.body.horizontalStretch - 1) * 0.18),
        mantleLift: size * morphologyProfile.body.mantleLiftRatio * 0.7,
        lowerDrop: size * (0.028 + morphologyProfile.body.lowerDropRatio * 0.74),
        lobeCount: Math.max(7, Math.min(12, morphologyProfile.tentacles.count)),
        lobeAmplitude:
            0.5 +
            morphologyProfile.body.tentacleDepthRatio * 5.6 +
            (morphologyProfile.tentacles.tipReachScale - 1) * 0.15,
        skirtInflation: 0.18 + (morphologyProfile.tentacles.lateralReachScale - 1) * 0.08,
        wobbleAmplitude: size * (0.006 + morphologyProfile.body.wobbleAmplitudeRatio * 0.36),
        shapePhase,
        timeMs,
    };
}

/**
 * Draws the underwater glow behind the continuous blobby octopus.
 *
 * @param context Canvas 2D context.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param sceneCenterX Horizontal scene center.
 * @param sceneCenterY Vertical scene center.
 * @param interaction Smoothed pointer-aware interaction state.
 * @param timeMs Current animation time in milliseconds.
 * @param shapePhase Seed-based shape phase.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function drawOctopus3d2Atmosphere(
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
    shapePhase: number,
): void {
    const glowGradient = context.createRadialGradient(
        sceneCenterX + interaction.gazeX * size * 0.09,
        sceneCenterY - size * 0.17 + interaction.gazeY * size * 0.045,
        size * 0.035,
        sceneCenterX,
        sceneCenterY,
        size * 0.62,
    );
    glowGradient.addColorStop(0, `${palette.highlight}5c`);
    glowGradient.addColorStop(0.34, `${palette.accent}22`);
    glowGradient.addColorStop(1, `${palette.highlight}00`);
    context.fillStyle = glowGradient;
    context.fillRect(0, 0, size, size);

    const lowerGlowGradient = context.createRadialGradient(
        sceneCenterX + Math.sin(timeMs / 1550 + shapePhase) * size * 0.04,
        sceneCenterY + size * 0.22,
        size * 0.07,
        sceneCenterX,
        sceneCenterY + size * 0.28,
        size * 0.46,
    );
    lowerGlowGradient.addColorStop(0, `${palette.secondary}22`);
    lowerGlowGradient.addColorStop(1, `${palette.secondary}00`);
    context.fillStyle = lowerGlowGradient;
    context.fillRect(0, 0, size, size);
}

/**
 * Draws the soft contact shadow below the continuous blobby mesh.
 *
 * @param context Canvas 2D context.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param interaction Smoothed pointer-aware interaction state.
 * @param timeMs Current animation time in milliseconds.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function drawOctopus3d2Shadow(
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
    context.fillStyle = `${palette.shadow}63`;
    context.filter = `blur(${size * 0.022}px)`;
    context.beginPath();
    context.ellipse(
        size * 0.5 + interaction.gazeX * size * 0.035,
        size * 0.875 + Math.sin(timeMs / 980) * size * 0.007,
        size * (0.19 + interaction.intensity * 0.018),
        size * 0.058,
        0,
        0,
        Math.PI * 2,
    );
    context.fill();
    context.restore();
}

/**
 * Resolves visible projected patches for the single continuous octopus mesh.
 *
 * @param options Mesh patch projection options.
 * @returns Visible surface patches sorted later by depth.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function resolveVisibleBlobbyOctopusMeshPatches(
    options: ResolveBlobbyOctopusMeshPatchesOptions,
): Array<Octopus3dSurfacePatch> {
    const { profile, center, rotationX, rotationY, sceneCenterX, sceneCenterY, palette } = options;
    const surfacePatches: Array<Octopus3dSurfacePatch> = [];

    for (let latitudeIndex = 0; latitudeIndex < BLOBBY_MESH_LATITUDE_PATCH_COUNT; latitudeIndex++) {
        const startLatitude = -Math.PI / 2 + (latitudeIndex / BLOBBY_MESH_LATITUDE_PATCH_COUNT) * Math.PI;
        const endLatitude = -Math.PI / 2 + ((latitudeIndex + 1) / BLOBBY_MESH_LATITUDE_PATCH_COUNT) * Math.PI;
        const verticalProgress = (latitudeIndex + 0.5) / BLOBBY_MESH_LATITUDE_PATCH_COUNT;

        for (let longitudeIndex = 0; longitudeIndex < BLOBBY_MESH_LONGITUDE_PATCH_COUNT; longitudeIndex++) {
            const startLongitude = -Math.PI + (longitudeIndex / BLOBBY_MESH_LONGITUDE_PATCH_COUNT) * Math.PI * 2;
            const endLongitude = -Math.PI + ((longitudeIndex + 1) / BLOBBY_MESH_LONGITUDE_PATCH_COUNT) * Math.PI * 2;
            const midLongitude = (startLongitude + endLongitude) / 2;
            const localCorners = [
                sampleBlobbyOctopusMeshPoint(profile, startLatitude, startLongitude),
                sampleBlobbyOctopusMeshPoint(profile, startLatitude, endLongitude),
                sampleBlobbyOctopusMeshPoint(profile, endLatitude, endLongitude),
                sampleBlobbyOctopusMeshPoint(profile, endLatitude, startLongitude),
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
                projectScenePoint(transformedCorner, profile.size, sceneCenterX, sceneCenterY),
            ) as [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];
            const frontBias = Math.max(0, Math.cos(midLongitude));

            surfacePatches.push({
                corners: projectedCorners,
                averageDepth:
                    transformedCorners.reduce((depthSum, transformedCorner) => depthSum + transformedCorner.z, 0) /
                    transformedCorners.length,
                lightIntensity: clampNumber(dotProduct3D(surfaceNormal, BLOBBY_LIGHT_DIRECTION), -1, 1),
                fillStyle: resolveOrganic3dSurfacePatchFillStyle(
                    palette,
                    verticalProgress + smoothStep(0.62, 1, verticalProgress) * 0.14 - frontBias * 0.04,
                ),
                outlineColor: verticalProgress > 0.68 ? `${palette.shadow}63` : `${palette.highlight}42`,
            });
        }
    }

    return surfacePatches;
}

/**
 * Samples one point on the continuous blobby octopus surface.
 *
 * @param profile Derived continuous mesh profile.
 * @param latitude Surface latitude in radians.
 * @param longitude Surface longitude in radians.
 * @returns Local 3D surface point.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function sampleBlobbyOctopusMeshPoint(profile: BlobbyOctopusMeshProfile, latitude: number, longitude: number): Point3D {
    const sineLatitude = Math.sin(latitude);
    const cosineLatitude = Math.cos(latitude);
    const sineLongitude = Math.sin(longitude);
    const cosineLongitude = Math.cos(longitude);
    const topProgress = smoothStep(0.08, 1, -sineLatitude);
    const lowerProgress = smoothStep(0.08, 0.95, sineLatitude);
    const tentacleBand = smoothStep(0.28, 0.88, sineLatitude) * (1 - smoothStep(0.9, 1, sineLatitude) * 0.62);
    const lobeWave =
        0.5 +
        0.5 *
            Math.cos(
                longitude * profile.lobeCount +
                    profile.shapePhase * 0.72 +
                    Math.sin(profile.timeMs / 1380 + longitude) * 0.28,
            );
    const lobeStrength = Math.pow(lobeWave, 2.15) * tentacleBand * profile.lobeAmplitude;
    const breathing =
        Math.sin(profile.timeMs / 1120 + profile.shapePhase + longitude * 0.7 + latitude * 1.35) *
        profile.wobbleAmplitude;
    const skirtInflation = lowerProgress * profile.skirtInflation;
    const horizontalScale = 1 - topProgress * 0.06 + skirtInflation + lobeStrength * 0.18;
    const depthScale = 1 - topProgress * 0.03 + skirtInflation * 0.72 + lobeStrength * 0.14;
    const lowerSink = lowerProgress * profile.lowerDrop + lobeStrength * profile.radiusY * 0.22;
    const lowerCurl =
        Math.sin(longitude * 2 + profile.shapePhase + profile.timeMs / 1640) *
        lowerProgress *
        profile.wobbleAmplitude *
        0.52;

    return {
        x: sineLongitude * cosineLatitude * (profile.radiusX * horizontalScale + breathing),
        y:
            sineLatitude * profile.radiusY -
            topProgress * profile.mantleLift +
            lowerSink +
            lowerCurl +
            lobeStrength * profile.radiusY * 0.08,
        z: cosineLongitude * cosineLatitude * (profile.radiusZ * depthScale + breathing * 0.7),
    };
}

/**
 * Resolves the front surface depth used by projected face features.
 *
 * @param profile Derived continuous mesh profile.
 * @param localX Local X coordinate.
 * @param localY Local Y coordinate.
 * @returns Front-facing local Z depth.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function resolveBlobbyOctopusFaceSurfaceDepth(
    profile: BlobbyOctopusMeshProfile,
    localX: number,
    localY: number,
): number {
    return (
        resolveEllipsoidSurfaceDepth(profile.radiusX * 0.92, profile.radiusY * 0.96, profile.radiusZ, localX, localY) +
        profile.size * 0.008
    );
}

/**
 * Smoothly interpolates from zero to one between two edges.
 *
 * @param edgeStart Lower edge.
 * @param edgeEnd Upper edge.
 * @param value Input value.
 * @returns Smoothed ratio in the range `[0, 1]`.
 *
 * @private helper of `octopus3d2AvatarVisual`
 */
function smoothStep(edgeStart: number, edgeEnd: number, value: number): number {
    const ratio = clampNumber((value - edgeStart) / (edgeEnd - edgeStart), 0, 1);

    return ratio * ratio * (3 - 2 * ratio);
}
