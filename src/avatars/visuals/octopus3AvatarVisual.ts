/* eslint-disable no-magic-numbers */

import { drawAvatarFrame } from '../avatarRenderingUtils';
import type { AvatarPalette, AvatarVisualDefinition } from '../types/AvatarVisualDefinition';
import type { OrganicTentacleShape } from './octopusAvatarVisualShared';
import { createOrganicOctopusBodyPoints, createOrganicOctopusTentacleShapes, getCubicBezierPoint, resolveOrganicEyeMotion, sampleOrganicTentacleRibbonPoints, traceSmoothClosedPath } from './octopusAvatarVisualShared';

/**
 * Deterministic morphology knobs that keep `Octopus3` recognizable while widening seeded body, face, and tentacle variety.
 *
 * @private helper of `octopus3AvatarVisual`
 */
export type Octopus3MorphologyProfile = {
    readonly bodyFamily: 'lantern' | 'drifter' | 'rounded';
    readonly faceFamily: 'watchful' | 'sleepy' | 'mischief';
    readonly body: {
        readonly centerXJitterRatio: number;
        readonly centerYRatio: number;
        readonly bodyRadiusRatio: number;
        readonly horizontalStretch: number;
        readonly verticalStretch: number;
        readonly mantleLiftRatio: number;
        readonly lowerDropRatio: number;
        readonly tentacleDepthRatio: number;
        readonly wobbleAmplitudeRatio: number;
        readonly lobeCount: number;
        readonly pointCount: number;
        readonly shadowWidthRatio: number;
        readonly shadowHeightRatio: number;
        readonly crownHighlightWidthRatio: number;
        readonly crownHighlightHeightRatio: number;
        readonly crownHighlightYOffsetRatio: number;
    };
    readonly tentacles: {
        readonly count: number;
        readonly flowLengthScale: number;
        readonly lateralReachScale: number;
        readonly tipReachScale: number;
        readonly baseWidthScale: number;
        readonly tipWidthScale: number;
        readonly rootSpreadScale: number;
        readonly startYOffsetScale: number;
        readonly swayScale: number;
    };
    readonly face: {
        readonly eyeSpacingRatio: number;
        readonly eyeCenterYOffsetRatio: number;
        readonly eyeRadiusXRatio: number;
        readonly eyeHeightRatio: number;
        readonly eyeRotationRange: number;
        readonly eyeTiltBias: number;
        readonly mouthWidthRatio: number;
        readonly mouthYOffsetRatio: number;
        readonly mouthCurveDepthRatio: number;
        readonly mouthCenterOffsetRatio: number;
        readonly mouthCornerTiltRatio: number;
        readonly eyeStyle: {
            readonly irisScale: number;
            readonly pupilWidthScale: number;
            readonly pupilHeightScale: number;
            readonly upperLidArchRatio: number;
            readonly upperLidInsetRatio: number;
            readonly lowerLidOpacity: number;
        };
    };
    readonly details: {
        readonly mantleCurrentCount: number;
        readonly mantleNodeCount: number;
    };
};

/**
 * Builds one deterministic morphology profile for `Octopus3`.
 *
 * @param createRandom Seeded random factory scoped to the current avatar.
 * @returns Stable morphology profile.
 *
 * @private helper of `octopus3AvatarVisual`
 */
export function createOctopus3MorphologyProfile(
    createRandom: (salt: string) => () => number,
): Octopus3MorphologyProfile {
    const bodyRandom = createRandom('octopus3-body-profile');
    const faceRandom = createRandom('octopus3-face-profile');
    const detailRandom = createRandom('octopus3-detail-profile');
    const bodyFamilyRoll = bodyRandom();
    let bodyFamily: Octopus3MorphologyProfile['bodyFamily'];
    let body: Octopus3MorphologyProfile['body'];
    let tentacles: Octopus3MorphologyProfile['tentacles'];

    if (bodyFamilyRoll < 0.34) {
        bodyFamily = 'lantern';
        body = {
            centerXJitterRatio: resolveSeededRange(bodyRandom, -0.018, 0.018),
            centerYRatio: resolveSeededRange(bodyRandom, 0.39, 0.435),
            bodyRadiusRatio: resolveSeededRange(bodyRandom, 0.19, 0.23),
            horizontalStretch: resolveSeededRange(bodyRandom, 0.94, 1.08),
            verticalStretch: resolveSeededRange(bodyRandom, 1.02, 1.18),
            mantleLiftRatio: resolveSeededRange(bodyRandom, 0.115, 0.148),
            lowerDropRatio: resolveSeededRange(bodyRandom, 0.042, 0.066),
            tentacleDepthRatio: resolveSeededRange(bodyRandom, 0.018, 0.03),
            wobbleAmplitudeRatio: resolveSeededRange(bodyRandom, 0.009, 0.017),
            lobeCount: resolveSeededIntegerRange(bodyRandom, 4, 6),
            pointCount: resolveSeededIntegerRange(bodyRandom, 38, 42),
            shadowWidthRatio: resolveSeededRange(bodyRandom, 0.18, 0.23),
            shadowHeightRatio: resolveSeededRange(bodyRandom, 0.055, 0.075),
            crownHighlightWidthRatio: resolveSeededRange(bodyRandom, 0.14, 0.18),
            crownHighlightHeightRatio: resolveSeededRange(bodyRandom, 0.045, 0.062),
            crownHighlightYOffsetRatio: resolveSeededRange(bodyRandom, -0.165, -0.135),
        };
        tentacles = {
            count: resolveSeededIntegerRange(bodyRandom, 7, 10),
            flowLengthScale: resolveSeededRange(bodyRandom, 1.08, 1.34),
            lateralReachScale: resolveSeededRange(bodyRandom, 0.72, 0.94),
            tipReachScale: resolveSeededRange(bodyRandom, 0.82, 1.06),
            baseWidthScale: resolveSeededRange(bodyRandom, 0.82, 0.98),
            tipWidthScale: resolveSeededRange(bodyRandom, 0.9, 1.08),
            rootSpreadScale: resolveSeededRange(bodyRandom, 0.76, 0.94),
            startYOffsetScale: resolveSeededRange(bodyRandom, 0.82, 1),
            swayScale: resolveSeededRange(bodyRandom, 0.82, 1.02),
        };
    } else if (bodyFamilyRoll < 0.68) {
        bodyFamily = 'drifter';
        body = {
            centerXJitterRatio: resolveSeededRange(bodyRandom, -0.025, 0.025),
            centerYRatio: resolveSeededRange(bodyRandom, 0.425, 0.46),
            bodyRadiusRatio: resolveSeededRange(bodyRandom, 0.175, 0.215),
            horizontalStretch: resolveSeededRange(bodyRandom, 1.22, 1.42),
            verticalStretch: resolveSeededRange(bodyRandom, 0.82, 0.92),
            mantleLiftRatio: resolveSeededRange(bodyRandom, 0.092, 0.115),
            lowerDropRatio: resolveSeededRange(bodyRandom, 0.02, 0.036),
            tentacleDepthRatio: resolveSeededRange(bodyRandom, 0.032, 0.052),
            wobbleAmplitudeRatio: resolveSeededRange(bodyRandom, 0.013, 0.022),
            lobeCount: resolveSeededIntegerRange(bodyRandom, 7, 9),
            pointCount: resolveSeededIntegerRange(bodyRandom, 40, 46),
            shadowWidthRatio: resolveSeededRange(bodyRandom, 0.24, 0.28),
            shadowHeightRatio: resolveSeededRange(bodyRandom, 0.06, 0.082),
            crownHighlightWidthRatio: resolveSeededRange(bodyRandom, 0.17, 0.22),
            crownHighlightHeightRatio: resolveSeededRange(bodyRandom, 0.038, 0.055),
            crownHighlightYOffsetRatio: resolveSeededRange(bodyRandom, -0.14, -0.11),
        };
        tentacles = {
            count: resolveSeededIntegerRange(bodyRandom, 10, 13),
            flowLengthScale: resolveSeededRange(bodyRandom, 0.88, 1.08),
            lateralReachScale: resolveSeededRange(bodyRandom, 1.18, 1.42),
            tipReachScale: resolveSeededRange(bodyRandom, 1.12, 1.42),
            baseWidthScale: resolveSeededRange(bodyRandom, 0.9, 1.06),
            tipWidthScale: resolveSeededRange(bodyRandom, 0.88, 1.08),
            rootSpreadScale: resolveSeededRange(bodyRandom, 1.12, 1.32),
            startYOffsetScale: resolveSeededRange(bodyRandom, 0.92, 1.14),
            swayScale: resolveSeededRange(bodyRandom, 1.04, 1.22),
        };
    } else {
        bodyFamily = 'rounded';
        body = {
            centerXJitterRatio: resolveSeededRange(bodyRandom, -0.02, 0.02),
            centerYRatio: resolveSeededRange(bodyRandom, 0.398, 0.442),
            bodyRadiusRatio: resolveSeededRange(bodyRandom, 0.208, 0.248),
            horizontalStretch: resolveSeededRange(bodyRandom, 1.06, 1.22),
            verticalStretch: resolveSeededRange(bodyRandom, 0.9, 1.01),
            mantleLiftRatio: resolveSeededRange(bodyRandom, 0.1, 0.128),
            lowerDropRatio: resolveSeededRange(bodyRandom, 0.032, 0.052),
            tentacleDepthRatio: resolveSeededRange(bodyRandom, 0.038, 0.06),
            wobbleAmplitudeRatio: resolveSeededRange(bodyRandom, 0.014, 0.024),
            lobeCount: resolveSeededIntegerRange(bodyRandom, 5, 8),
            pointCount: resolveSeededIntegerRange(bodyRandom, 39, 44),
            shadowWidthRatio: resolveSeededRange(bodyRandom, 0.2, 0.25),
            shadowHeightRatio: resolveSeededRange(bodyRandom, 0.055, 0.08),
            crownHighlightWidthRatio: resolveSeededRange(bodyRandom, 0.16, 0.2),
            crownHighlightHeightRatio: resolveSeededRange(bodyRandom, 0.05, 0.07),
            crownHighlightYOffsetRatio: resolveSeededRange(bodyRandom, -0.155, -0.122),
        };
        tentacles = {
            count: resolveSeededIntegerRange(bodyRandom, 8, 12),
            flowLengthScale: resolveSeededRange(bodyRandom, 0.94, 1.16),
            lateralReachScale: resolveSeededRange(bodyRandom, 0.9, 1.14),
            tipReachScale: resolveSeededRange(bodyRandom, 0.96, 1.22),
            baseWidthScale: resolveSeededRange(bodyRandom, 1.02, 1.2),
            tipWidthScale: resolveSeededRange(bodyRandom, 1.02, 1.22),
            rootSpreadScale: resolveSeededRange(bodyRandom, 0.94, 1.08),
            startYOffsetScale: resolveSeededRange(bodyRandom, 0.9, 1.08),
            swayScale: resolveSeededRange(bodyRandom, 0.9, 1.1),
        };
    }

    const faceFamilyRoll = faceRandom();
    let faceFamily: Octopus3MorphologyProfile['faceFamily'];
    let face: Octopus3MorphologyProfile['face'];

    if (faceFamilyRoll < 0.34) {
        faceFamily = 'watchful';
        face = {
            eyeSpacingRatio: resolveSeededRange(faceRandom, 0.118, 0.152),
            eyeCenterYOffsetRatio: resolveSeededRange(faceRandom, -0.026, -0.002),
            eyeRadiusXRatio: resolveSeededRange(faceRandom, 0.05, 0.062),
            eyeHeightRatio: resolveSeededRange(faceRandom, 1.18, 1.38),
            eyeRotationRange: resolveSeededRange(faceRandom, 0.16, 0.28),
            eyeTiltBias: resolveSeededRange(faceRandom, 0.02, 0.06),
            mouthWidthRatio: resolveSeededRange(faceRandom, 0.058, 0.074),
            mouthYOffsetRatio: resolveSeededRange(faceRandom, 0.086, 0.104),
            mouthCurveDepthRatio: resolveSeededRange(faceRandom, 0.126, 0.15),
            mouthCenterOffsetRatio: resolveSeededRange(faceRandom, -0.006, 0.006),
            mouthCornerTiltRatio: resolveSeededRange(faceRandom, -0.002, 0.002),
            eyeStyle: {
                irisScale: resolveSeededRange(faceRandom, 1, 1.1),
                pupilWidthScale: resolveSeededRange(faceRandom, 0.86, 1.02),
                pupilHeightScale: resolveSeededRange(faceRandom, 0.94, 1.08),
                upperLidArchRatio: resolveSeededRange(faceRandom, 0.96, 1.12),
                upperLidInsetRatio: resolveSeededRange(faceRandom, 0.08, 0.14),
                lowerLidOpacity: resolveSeededRange(faceRandom, 0.12, 0.22),
            },
        };
    } else if (faceFamilyRoll < 0.68) {
        faceFamily = 'sleepy';
        face = {
            eyeSpacingRatio: resolveSeededRange(faceRandom, 0.092, 0.124),
            eyeCenterYOffsetRatio: resolveSeededRange(faceRandom, -0.002, 0.024),
            eyeRadiusXRatio: resolveSeededRange(faceRandom, 0.058, 0.074),
            eyeHeightRatio: resolveSeededRange(faceRandom, 0.96, 1.14),
            eyeRotationRange: resolveSeededRange(faceRandom, 0.1, 0.22),
            eyeTiltBias: resolveSeededRange(faceRandom, 0.01, 0.05),
            mouthWidthRatio: resolveSeededRange(faceRandom, 0.066, 0.086),
            mouthYOffsetRatio: resolveSeededRange(faceRandom, 0.094, 0.118),
            mouthCurveDepthRatio: resolveSeededRange(faceRandom, 0.118, 0.145),
            mouthCenterOffsetRatio: resolveSeededRange(faceRandom, -0.004, 0.004),
            mouthCornerTiltRatio: resolveSeededRange(faceRandom, -0.004, 0.004),
            eyeStyle: {
                irisScale: resolveSeededRange(faceRandom, 0.9, 1),
                pupilWidthScale: resolveSeededRange(faceRandom, 1, 1.18),
                pupilHeightScale: resolveSeededRange(faceRandom, 0.78, 0.92),
                upperLidArchRatio: resolveSeededRange(faceRandom, 0.7, 0.88),
                upperLidInsetRatio: resolveSeededRange(faceRandom, -0.02, 0.06),
                lowerLidOpacity: resolveSeededRange(faceRandom, 0.22, 0.34),
            },
        };
    } else {
        faceFamily = 'mischief';
        face = {
            eyeSpacingRatio: resolveSeededRange(faceRandom, 0.086, 0.114),
            eyeCenterYOffsetRatio: resolveSeededRange(faceRandom, -0.018, 0.01),
            eyeRadiusXRatio: resolveSeededRange(faceRandom, 0.046, 0.06),
            eyeHeightRatio: resolveSeededRange(faceRandom, 1.08, 1.28),
            eyeRotationRange: resolveSeededRange(faceRandom, 0.28, 0.44),
            eyeTiltBias: resolveSeededRange(faceRandom, 0.12, 0.22),
            mouthWidthRatio: resolveSeededRange(faceRandom, 0.052, 0.074),
            mouthYOffsetRatio: resolveSeededRange(faceRandom, 0.082, 0.1),
            mouthCurveDepthRatio: resolveSeededRange(faceRandom, 0.116, 0.15),
            mouthCenterOffsetRatio: resolveSeededRange(faceRandom, -0.018, 0.018),
            mouthCornerTiltRatio: resolveSeededRange(faceRandom, -0.01, 0.01),
            eyeStyle: {
                irisScale: resolveSeededRange(faceRandom, 1.04, 1.12),
                pupilWidthScale: resolveSeededRange(faceRandom, 0.72, 0.9),
                pupilHeightScale: resolveSeededRange(faceRandom, 0.96, 1.14),
                upperLidArchRatio: resolveSeededRange(faceRandom, 0.88, 1.02),
                upperLidInsetRatio: resolveSeededRange(faceRandom, 0.04, 0.12),
                lowerLidOpacity: resolveSeededRange(faceRandom, 0.08, 0.18),
            },
        };
    }

    return {
        bodyFamily,
        faceFamily,
        body,
        tentacles,
        face,
        details: {
            mantleCurrentCount: resolveSeededIntegerRange(detailRandom, 4, 8),
            mantleNodeCount: resolveSeededIntegerRange(detailRandom, 3, 7),
        },
    };
}

/**
 * Resolves one seeded floating-point number inside the provided range.
 *
 * @param random Seeded random generator.
 * @param minimumValue Inclusive lower bound.
 * @param maximumValue Inclusive upper bound.
 * @returns Seeded number within the range.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function resolveSeededRange(random: () => number, minimumValue: number, maximumValue: number): number {
    return minimumValue + random() * (maximumValue - minimumValue);
}

/**
 * Resolves one seeded integer inside the provided inclusive range.
 *
 * @param random Seeded random generator.
 * @param minimumValue Inclusive lower bound.
 * @param maximumValue Inclusive upper bound.
 * @returns Seeded integer within the range.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function resolveSeededIntegerRange(random: () => number, minimumValue: number, maximumValue: number): number {
    return minimumValue + Math.floor(random() * (maximumValue - minimumValue + 1));
}

/**
 * Converts an opacity ratio into a two-digit hexadecimal alpha suffix.
 *
 * @param opacity Opacity ratio in the range `[0, 1]`.
 * @returns Two-digit hexadecimal alpha string.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function formatAlphaHex(opacity: number): string {
    return Math.round(Math.min(1, Math.max(0, opacity)) * 255)
        .toString(16)
        .padStart(2, '0');
}

/**
 * Octopus3 avatar visual.
 *
 * @private built-in avatar visual
 */
export const octopus3AvatarVisual: AvatarVisualDefinition = {
    id: 'octopus3',
    title: 'Octopus3',
    description: 'Gelatinous alien octopus with a morphing mantle, responsive eyes, and visible ribbon tentacles.',
    isAnimated: true,
    supportsPointerTracking: true,
    render({ context, size, palette, createRandom, timeMs, interaction }) {
        const morphologyProfile = createOctopus3MorphologyProfile(createRandom);
        const animationRandom = createRandom('octopus3-animation-profile');
        const eyeRandom = createRandom('octopus3-eye-profile');
        const centerX =
            size * (0.5 + morphologyProfile.body.centerXJitterRatio) + interaction.bodyOffsetX * size * 0.05;
        const centerY = size * morphologyProfile.body.centerYRatio + interaction.bodyOffsetY * size * 0.035;
        const bodyRadius = size * morphologyProfile.body.bodyRadiusRatio;
        const horizontalStretch = morphologyProfile.body.horizontalStretch;
        const verticalStretch = morphologyProfile.body.verticalStretch;
        const mantleLift = size * morphologyProfile.body.mantleLiftRatio;
        const lowerDrop = size * morphologyProfile.body.lowerDropRatio;
        const tentacleDepth = size * morphologyProfile.body.tentacleDepthRatio;
        const wobbleAmplitude = size * morphologyProfile.body.wobbleAmplitudeRatio;
        const lobeCount = morphologyProfile.body.lobeCount;
        const shapePhase = animationRandom() * Math.PI * 2;
        const eyeSpacing = size * morphologyProfile.face.eyeSpacingRatio;
        const eyeCenterY = centerY + size * morphologyProfile.face.eyeCenterYOffsetRatio;
        const eyeRadiusX = size * morphologyProfile.face.eyeRadiusXRatio;
        const eyeRadiusY = eyeRadiusX * morphologyProfile.face.eyeHeightRatio;
        const bodyPoints = createOrganicOctopusBodyPoints({
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
            pointCount: morphologyProfile.body.pointCount,
        });
        const tentacleShapes = createOrganicOctopusTentacleShapes({
            size,
            centerX,
            centerY,
            bodyRadius,
            horizontalStretch,
            tentacleCount: morphologyProfile.tentacles.count,
            shapePhase,
            createRandom,
            timeMs,
            saltPrefix: 'octopus3',
            bodyPoints,
            variation: {
                flowLengthScale: morphologyProfile.tentacles.flowLengthScale,
                lateralReachScale: morphologyProfile.tentacles.lateralReachScale,
                tipReachScale: morphologyProfile.tentacles.tipReachScale,
                baseWidthScale: morphologyProfile.tentacles.baseWidthScale,
                tipWidthScale: morphologyProfile.tentacles.tipWidthScale,
                rootSpreadScale: morphologyProfile.tentacles.rootSpreadScale,
                startYOffsetScale: morphologyProfile.tentacles.startYOffsetScale,
                swayScale: morphologyProfile.tentacles.swayScale,
            },
        });

        drawAvatarFrame(context, size, palette);
        drawOctopus3Atmosphere(context, size, palette, centerX, centerY, timeMs, shapePhase, morphologyProfile);

        context.beginPath();
        context.ellipse(
            centerX,
            centerY + size * 0.25,
            size * morphologyProfile.body.shadowWidthRatio,
            size * morphologyProfile.body.shadowHeightRatio,
            0,
            0,
            Math.PI * 2,
        );
        context.fillStyle = `${palette.shadow}33`;
        context.fill();

        for (const tentacleShape of tentacleShapes) {
            drawTentacleRibbon(context, tentacleShape, palette);
        }

        context.save();
        traceSmoothClosedPath(context, bodyPoints);
        const bodyGradient = context.createRadialGradient(
            centerX - size * 0.1,
            centerY - size * 0.18,
            size * 0.04,
            centerX,
            centerY + size * 0.16,
            size * 0.54,
        );
        bodyGradient.addColorStop(0, palette.highlight);
        bodyGradient.addColorStop(0.18, palette.secondary);
        bodyGradient.addColorStop(0.55, palette.primary);
        bodyGradient.addColorStop(1, palette.shadow);
        context.fillStyle = bodyGradient;
        context.shadowColor = `${palette.shadow}aa`;
        context.shadowBlur = size * 0.08;
        context.shadowOffsetY = size * 0.02;
        context.fill();
        context.restore();

        context.save();
        traceSmoothClosedPath(context, bodyPoints);
        context.clip();

        const innerGlowGradient = context.createLinearGradient(
            centerX,
            centerY - size * 0.24,
            centerX,
            centerY + size * 0.26,
        );
        innerGlowGradient.addColorStop(0, `${palette.highlight}66`);
        innerGlowGradient.addColorStop(0.4, `${palette.secondary}26`);
        innerGlowGradient.addColorStop(1, `${palette.shadow}00`);
        context.fillStyle = innerGlowGradient;
        context.fillRect(centerX - size * 0.36, centerY - size * 0.34, size * 0.72, size * 0.72);

        drawMantleCurrents(context, centerX, centerY, size, palette, timeMs, shapePhase, morphologyProfile);
        drawMantleNodes(context, centerX, centerY, size, palette, createRandom, morphologyProfile);
        context.restore();

        context.save();
        traceSmoothClosedPath(context, bodyPoints);
        context.strokeStyle = `${palette.highlight}73`;
        context.lineWidth = size * 0.013;
        context.stroke();
        context.restore();

        context.beginPath();
        context.ellipse(
            centerX,
            centerY + size * morphologyProfile.body.crownHighlightYOffsetRatio,
            size * morphologyProfile.body.crownHighlightWidthRatio,
            size * morphologyProfile.body.crownHighlightHeightRatio,
            0,
            Math.PI,
            Math.PI * 2,
        );
        context.fillStyle = `${palette.highlight}3d`;
        context.fill();

        drawSeededEye(
            context,
            centerX - eyeSpacing,
            eyeCenterY,
            eyeRadiusX,
            eyeRadiusY,
            -morphologyProfile.face.eyeTiltBias + (eyeRandom() - 0.5) * morphologyProfile.face.eyeRotationRange,
            palette,
            timeMs,
            shapePhase,
            interaction,
            morphologyProfile.face.eyeStyle,
        );
        drawSeededEye(
            context,
            centerX + eyeSpacing,
            eyeCenterY,
            eyeRadiusX,
            eyeRadiusY,
            morphologyProfile.face.eyeTiltBias + (eyeRandom() - 0.5) * morphologyProfile.face.eyeRotationRange,
            palette,
            timeMs,
            shapePhase + Math.PI / 4,
            interaction,
            morphologyProfile.face.eyeStyle,
        );

        const mouthHalfWidth = size * morphologyProfile.face.mouthWidthRatio;
        const mouthY = centerY + size * morphologyProfile.face.mouthYOffsetRatio;
        const mouthCornerTilt = size * morphologyProfile.face.mouthCornerTiltRatio;

        context.beginPath();
        context.moveTo(centerX - mouthHalfWidth, mouthY - mouthCornerTilt);
        context.quadraticCurveTo(
            centerX + size * morphologyProfile.face.mouthCenterOffsetRatio,
            centerY +
                size * (morphologyProfile.face.mouthCurveDepthRatio + Math.sin(timeMs / 620 + shapePhase) * 0.016) +
                interaction.gazeY * size * 0.012,
            centerX + mouthHalfWidth,
            mouthY + mouthCornerTilt,
        );
        context.strokeStyle = `${palette.ink}b3`;
        context.lineWidth = size * 0.012;
        context.lineCap = 'round';
        context.stroke();
    },
};

/**
 * Draws the deep-sea glow around the Octopus3 silhouette.
 *
 * @param context Canvas 2D context.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param centerX Body center X coordinate.
 * @param centerY Body center Y coordinate.
 * @param timeMs Current animation time in milliseconds.
 * @param shapePhase Seed-based phase offset.
 * @param morphologyProfile Seeded morphology profile.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function drawOctopus3Atmosphere(
    context: CanvasRenderingContext2D,
    size: number,
    palette: AvatarPalette,
    centerX: number,
    centerY: number,
    timeMs: number,
    shapePhase: number,
    morphologyProfile: Octopus3MorphologyProfile,
): void {
    const haloGradient = context.createRadialGradient(
        centerX,
        centerY - size * (0.07 + (morphologyProfile.body.verticalStretch - 0.9) * 0.05),
        size * 0.06,
        centerX,
        centerY,
        size * (0.56 + morphologyProfile.body.bodyRadiusRatio * 0.45),
    );
    haloGradient.addColorStop(0, `${palette.highlight}5c`);
    haloGradient.addColorStop(0.35, `${palette.accent}26`);
    haloGradient.addColorStop(1, `${palette.highlight}00`);
    context.fillStyle = haloGradient;
    context.fillRect(0, 0, size, size);

    const lowerGlowGradient = context.createRadialGradient(
        centerX + Math.sin(timeMs / 1600 + shapePhase) * size * 0.04,
        centerY + size * (0.18 + morphologyProfile.tentacles.flowLengthScale * 0.025),
        size * 0.04,
        centerX,
        centerY + size * (0.18 + morphologyProfile.tentacles.flowLengthScale * 0.025),
        size * (0.42 + morphologyProfile.tentacles.lateralReachScale * 0.06),
    );
    lowerGlowGradient.addColorStop(0, `${palette.secondary}1f`);
    lowerGlowGradient.addColorStop(1, `${palette.secondary}00`);
    context.fillStyle = lowerGlowGradient;
    context.fillRect(0, 0, size, size);
}

/**
 * Draws one ribbon tentacle with a filled organic profile and visible sucker highlights.
 *
 * @param context Canvas 2D context.
 * @param tentacleShape Deterministic tentacle descriptor.
 * @param palette Derived avatar palette.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function drawTentacleRibbon(
    context: CanvasRenderingContext2D,
    tentacleShape: OrganicTentacleShape,
    palette: AvatarPalette,
): void {
    const ribbonPoints = sampleOrganicTentacleRibbonPoints(tentacleShape);
    const gradient = context.createLinearGradient(
        tentacleShape.startPoint.x,
        tentacleShape.startPoint.y,
        tentacleShape.endPoint.x,
        tentacleShape.endPoint.y,
    );

    gradient.addColorStop(0, tentacleShape.colorBias < 0.35 ? palette.secondary : palette.primary);
    gradient.addColorStop(0.58, palette.primary);
    gradient.addColorStop(1, tentacleShape.colorBias > 0.65 ? palette.highlight : palette.accent);

    context.save();
    traceTentacleRibbonPath(context, ribbonPoints);
    context.fillStyle = gradient;
    context.shadowColor = `${palette.shadow}80`;
    context.shadowBlur = tentacleShape.baseWidth * 1.2;
    context.shadowOffsetY = tentacleShape.baseWidth * 0.2;
    context.fill();
    context.restore();

    context.save();
    traceTentacleRibbonPath(context, ribbonPoints);
    context.strokeStyle = tentacleShape.highlightBias > 0.5 ? `${palette.highlight}52` : `${palette.highlight}38`;
    context.lineWidth = Math.max(1, tentacleShape.baseWidth * 0.12);
    context.stroke();
    context.restore();

    context.beginPath();
    context.moveTo(tentacleShape.startPoint.x, tentacleShape.startPoint.y);
    context.bezierCurveTo(
        tentacleShape.controlPointOne.x,
        tentacleShape.controlPointOne.y,
        tentacleShape.controlPointTwo.x,
        tentacleShape.controlPointTwo.y,
        tentacleShape.endPoint.x,
        tentacleShape.endPoint.y,
    );
    context.strokeStyle = `${palette.highlight}2e`;
    context.lineWidth = Math.max(1, tentacleShape.tipWidth * 0.9);
    context.lineCap = 'round';
    context.stroke();

    drawTentacleSuckers(context, tentacleShape, palette);
}

/**
 * Traces a closed ribbon path from sampled tentacle points.
 *
 * @param context Canvas 2D context.
 * @param ribbonPoints Sampled ribbon points.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function traceTentacleRibbonPath(
    context: CanvasRenderingContext2D,
    ribbonPoints: ReadonlyArray<{
        x: number;
        y: number;
        normalX: number;
        normalY: number;
        width: number;
    }>,
): void {
    const firstRibbonPoint = ribbonPoints[0]!;

    context.beginPath();
    context.moveTo(
        firstRibbonPoint.x + firstRibbonPoint.normalX * firstRibbonPoint.width,
        firstRibbonPoint.y + firstRibbonPoint.normalY * firstRibbonPoint.width,
    );

    for (const ribbonPoint of ribbonPoints.slice(1)) {
        context.lineTo(
            ribbonPoint.x + ribbonPoint.normalX * ribbonPoint.width,
            ribbonPoint.y + ribbonPoint.normalY * ribbonPoint.width,
        );
    }

    for (const ribbonPoint of [...ribbonPoints].reverse()) {
        context.lineTo(
            ribbonPoint.x - ribbonPoint.normalX * ribbonPoint.width,
            ribbonPoint.y - ribbonPoint.normalY * ribbonPoint.width,
        );
    }

    context.closePath();
}

/**
 * Draws a row of soft sucker highlights along one side of the ribbon tentacle.
 *
 * @param context Canvas 2D context.
 * @param tentacleShape Deterministic tentacle descriptor.
 * @param palette Derived avatar palette.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function drawTentacleSuckers(
    context: CanvasRenderingContext2D,
    tentacleShape: OrganicTentacleShape,
    palette: AvatarPalette,
): void {
    const undersideDirection = tentacleShape.endPoint.x >= tentacleShape.startPoint.x ? -1 : 1;

    for (let suckerIndex = 0; suckerIndex < 4; suckerIndex++) {
        const progress = 0.22 + suckerIndex * 0.17;
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
            Math.max(0, progress - 0.03),
        );
        const nextPoint = getCubicBezierPoint(
            tentacleShape.startPoint,
            tentacleShape.controlPointOne,
            tentacleShape.controlPointTwo,
            tentacleShape.endPoint,
            Math.min(1, progress + 0.03),
        );
        const tangentX = nextPoint.x - previousPoint.x;
        const tangentY = nextPoint.y - previousPoint.y;
        const tangentLength = Math.hypot(tangentX, tangentY) || 1;
        const normalX = (-tangentY / tangentLength) * undersideDirection;
        const normalY = (tangentX / tangentLength) * undersideDirection;
        const width =
            tentacleShape.baseWidth + (tentacleShape.tipWidth - tentacleShape.baseWidth) * Math.pow(progress, 1.1);
        const suckerX = point.x + normalX * width * 0.52;
        const suckerY = point.y + normalY * width * 0.52;
        const rotation = Math.atan2(normalY, normalX);

        context.beginPath();
        context.ellipse(suckerX, suckerY, width * 0.22, width * 0.11, rotation, 0, Math.PI * 2);
        context.fillStyle = `${palette.highlight}73`;
        context.fill();
        context.strokeStyle = `${palette.highlight}99`;
        context.lineWidth = Math.max(1, width * 0.08);
        context.stroke();
    }
}

/**
 * Draws slow inner currents inside the clipped Octopus3 mantle.
 *
 * @param context Canvas 2D context.
 * @param centerX Body center X coordinate.
 * @param centerY Body center Y coordinate.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param timeMs Current animation time in milliseconds.
 * @param shapePhase Seed-based phase offset.
 * @param morphologyProfile Seeded morphology profile.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function drawMantleCurrents(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    palette: AvatarPalette,
    timeMs: number,
    shapePhase: number,
    morphologyProfile: Octopus3MorphologyProfile,
): void {
    const centeredCurrentIndex = (morphologyProfile.details.mantleCurrentCount - 1) / 2;

    for (let currentIndex = 0; currentIndex < morphologyProfile.details.mantleCurrentCount; currentIndex++) {
        const horizontalOffset =
            (currentIndex - centeredCurrentIndex) *
            size *
            (0.05 + (morphologyProfile.body.horizontalStretch - 0.9) * 0.025);
        const sway = Math.sin(timeMs / 680 + currentIndex * 0.78 + shapePhase) * size * 0.024;

        context.beginPath();
        context.moveTo(
            centerX + horizontalOffset * 0.3,
            centerY - size * (0.11 + morphologyProfile.body.verticalStretch * 0.02),
        );
        context.bezierCurveTo(
            centerX + horizontalOffset - sway * 0.25,
            centerY - size * 0.04,
            centerX + horizontalOffset + sway,
            centerY + size * 0.06,
            centerX + horizontalOffset * 0.7 + sway * 0.46,
            centerY + size * (0.16 + morphologyProfile.body.verticalStretch * 0.035),
        );
        context.strokeStyle = currentIndex % 2 === 0 ? `${palette.highlight}30` : `${palette.accent}26`;
        context.lineWidth =
            size * (0.0075 + currentIndex * 0.00065 + morphologyProfile.tentacles.baseWidthScale * 0.0005);
        context.lineCap = 'round';
        context.stroke();
    }
}

/**
 * Draws seeded luminous nodes inside the Octopus3 mantle.
 *
 * @param context Canvas 2D context.
 * @param centerX Body center X coordinate.
 * @param centerY Body center Y coordinate.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param createRandom Seeded random factory scoped to the avatar.
 * @param morphologyProfile Seeded morphology profile.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function drawMantleNodes(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    size: number,
    palette: AvatarPalette,
    createRandom: (salt: string) => () => number,
    morphologyProfile: Octopus3MorphologyProfile,
): void {
    for (let nodeIndex = 0; nodeIndex < morphologyProfile.details.mantleNodeCount; nodeIndex++) {
        const nodeRandom = createRandom(`octopus3-node-${nodeIndex}`);
        const nodeX =
            centerX + (nodeRandom() - 0.5) * size * (0.2 + (morphologyProfile.body.horizontalStretch - 0.9) * 0.16);
        const nodeY =
            centerY -
            size * 0.03 +
            (nodeRandom() - 0.5) * size * (0.16 + (morphologyProfile.body.verticalStretch - 0.82) * 0.1);
        const nodeRadius = size * (0.016 + nodeRandom() * 0.016);

        context.beginPath();
        context.arc(nodeX, nodeY, nodeRadius, 0, Math.PI * 2);
        context.fillStyle = nodeIndex % 2 === 0 ? `${palette.highlight}40` : `${palette.accent}33`;
        context.fill();
    }
}

/**
 * Draws one expressive seeded eye with a slit pupil and slightly tilted eyelids.
 *
 * @param context Canvas 2D context.
 * @param centerX Eye center X coordinate.
 * @param centerY Eye center Y coordinate.
 * @param radiusX Eye horizontal radius.
 * @param radiusY Eye vertical radius.
 * @param rotation Eye rotation in radians.
 * @param palette Derived avatar palette.
 * @param timeMs Current animation time in milliseconds.
 * @param phase Seed-based animation phase.
 * @param interaction Smoothed avatar interaction state.
 * @param eyeStyle Seeded eye-style traits.
 *
 * @private helper of `octopus3AvatarVisual`
 */
function drawSeededEye(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    palette: AvatarPalette,
    timeMs: number,
    phase: number,
    interaction: {
        readonly gazeX: number;
        readonly gazeY: number;
        readonly intensity: number;
    },
    eyeStyle: Octopus3MorphologyProfile['face']['eyeStyle'],
): void {
    const { pupilOffsetX, pupilOffsetY } = resolveOrganicEyeMotion({
        radiusX,
        radiusY,
        timeMs,
        phase,
        interaction,
    });

    context.save();
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.beginPath();
    context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.fillStyle = '#f8fbff';
    context.fill();
    context.clip();

    const irisGradient = context.createRadialGradient(
        -radiusX * 0.18,
        -radiusY * 0.24,
        radiusX * 0.05,
        0,
        0,
        radiusX * 0.92,
    );
    irisGradient.addColorStop(0, palette.highlight);
    irisGradient.addColorStop(0.58, palette.secondary);
    irisGradient.addColorStop(1, palette.shadow);
    context.beginPath();
    context.ellipse(
        pupilOffsetX,
        pupilOffsetY,
        radiusX * 0.66 * eyeStyle.irisScale,
        radiusY * 0.74 * eyeStyle.irisScale,
        0,
        0,
        Math.PI * 2,
    );
    context.fillStyle = irisGradient;
    context.fill();

    context.beginPath();
    context.ellipse(
        pupilOffsetX,
        pupilOffsetY,
        radiusX * 0.14 * eyeStyle.pupilWidthScale,
        radiusY * 0.5 * eyeStyle.pupilHeightScale,
        0,
        0,
        Math.PI * 2,
    );
    context.fillStyle = palette.ink;
    context.fill();

    context.beginPath();
    context.ellipse(
        pupilOffsetX - radiusX * 0.22,
        pupilOffsetY - radiusY * 0.24,
        radiusX * 0.12,
        radiusY * 0.14,
        0,
        0,
        Math.PI * 2,
    );
    context.fillStyle = '#ffffff';
    context.fill();
    context.restore();

    context.save();
    context.translate(centerX, centerY);
    context.rotate(rotation);
    context.beginPath();
    context.ellipse(0, 0, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.strokeStyle = `${palette.shadow}d9`;
    context.lineWidth = radiusX * 0.18;
    context.stroke();

    context.beginPath();
    context.moveTo(-radiusX * 0.88, -radiusY * eyeStyle.upperLidInsetRatio);
    context.quadraticCurveTo(
        0,
        -radiusY * (eyeStyle.upperLidArchRatio - interaction.gazeY * 0.16 + interaction.intensity * 0.08),
        radiusX * 0.88,
        -radiusY * eyeStyle.upperLidInsetRatio,
    );
    context.strokeStyle = `${palette.shadow}73`;
    context.lineWidth = radiusX * 0.16;
    context.lineCap = 'round';
    context.stroke();

    if (eyeStyle.lowerLidOpacity > 0) {
        context.beginPath();
        context.moveTo(-radiusX * 0.74, radiusY * 0.2);
        context.quadraticCurveTo(0, radiusY * 0.38, radiusX * 0.74, radiusY * 0.2);
        context.strokeStyle = `${palette.highlight}${formatAlphaHex(eyeStyle.lowerLidOpacity)}`;
        context.lineWidth = radiusX * 0.08;
        context.lineCap = 'round';
        context.stroke();
    }

    context.restore();
}
