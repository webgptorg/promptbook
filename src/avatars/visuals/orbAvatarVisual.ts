/* eslint-disable no-magic-numbers */

import { Color } from '../../utils/color/Color';
import { darken } from '../../utils/color/operators/darken';
import { lighten } from '../../utils/color/operators/lighten';
import { saturate } from '../../utils/color/operators/saturate';
import { drawAvatarFrame, pickRandomItem } from '../avatarRenderingUtils';
import type { AvatarPalette, AvatarVisualDefinition } from '../types/AvatarVisualDefinition';
import { traceSmoothClosedPath } from './octopusAvatarVisualShared';

/**
 * Orb family labels used to keep the silhouette circle-based while still varying the rendering style.
 *
 * @private helper of `orbAvatarVisual`
 */
type OrbFamily = 'pearl' | 'nebula' | 'ember' | 'glacier';

/**
 * One sampled point on the morphing orb silhouette.
 *
 * @private helper of `orbAvatarVisual`
 */
type OrbPoint = {
    x: number;
    y: number;
};

/**
 * Derived palette used by the orb renderer.
 *
 * @private helper of `orbAvatarVisual`
 */
type OrbColorSet = {
    core: string;
    mid: string;
    outer: string;
    rim: string;
    highlight: string;
    aura: string;
};

/**
 * Deterministic orb profile used to keep the orb recognizable while still varying its motion and shape.
 *
 * @private helper of `orbAvatarVisual`
 */
type OrbMorphologyProfile = {
    family: OrbFamily;
    baseRadiusRatio: number;
    horizontalStretch: number;
    verticalStretch: number;
    wobbleAmplitude: number;
    wobbleFrequencyOne: number;
    wobbleFrequencyTwo: number;
    wobbleFrequencyThree: number;
    ringCount: number;
    sparkleCount: number;
    haloCount: number;
    coreShiftX: number;
    coreShiftY: number;
    highlightAngle: number;
    bandRotation: number;
    pulseSpeed: number;
    haloBlurRatio: number;
    sheenStrength: number;
};

/**
 * Family variants used by the orb renderer.
 *
 * @private helper of `orbAvatarVisual`
 */
const ORB_FAMILIES: ReadonlyArray<OrbFamily> = ['pearl', 'nebula', 'ember', 'glacier'];

/**
 * Built-in Orb avatar visual.
 *
 * @private built-in avatar visual
 */
export const orbAvatarVisual: AvatarVisualDefinition = {
    id: 'orb',
    title: 'Orb',
    description: 'Glowing morphing circle-orb with seeded gradients, smooth deformations, and luminous layered depth.',
    isAnimated: true,
    render({ context, size, palette, createRandom, timeMs }) {
        const profile = createOrbMorphologyProfile(createRandom);
        const colorSet = resolveOrbColorSet(palette, profile.family);
        const centerX = size * 0.5 + profile.coreShiftX * size * 0.06 + Math.sin(timeMs / 2600) * size * 0.009;
        const centerY =
            size * 0.5 +
            profile.coreShiftY * size * 0.06 +
            Math.cos(timeMs / 3100 + profile.highlightAngle) * size * 0.01;
        const radius = size * profile.baseRadiusRatio;
        const silhouettePoints = createOrbSilhouettePoints({
            centerX,
            centerY,
            radius,
            profile,
            timeMs,
        });

        drawAvatarFrame(context, size, palette);
        drawOrbAtmosphere(context, size, centerX, centerY, radius, colorSet, profile, timeMs);
        drawOrbBody(context, silhouettePoints, centerX, centerY, radius, colorSet, profile, size);

        context.save();
        traceSmoothClosedPath(context, silhouettePoints);
        context.clip();
        drawOrbInteriorRings(context, centerX, centerY, radius, colorSet, profile, size, timeMs);
        drawOrbSparkles(context, centerX, centerY, radius, colorSet, profile, size, createRandom, timeMs);
        drawOrbSheen(context, centerX, centerY, radius, colorSet, profile, size, timeMs);
        drawOrbCore(context, centerX, centerY, radius, colorSet, profile, size, timeMs);
        context.restore();

        drawOrbRim(context, silhouettePoints, colorSet, size);
    },
};

/**
 * Builds the deterministic orb profile from the seeded avatar random factory.
 *
 * @param createRandom Seeded random factory.
 * @returns Stable orb morphology profile.
 *
 * @private helper of `orbAvatarVisual`
 */
export function createOrbMorphologyProfile(createRandom: (salt: string) => () => number): OrbMorphologyProfile {
    const family = pickRandomItem(ORB_FAMILIES, createRandom('orb-family'));
    const familyAdjustment = resolveOrbFamilyAdjustment(family);
    const layoutRandom = createRandom('orb-layout');
    const effectRandom = createRandom('orb-effects');

    return {
        family,
        baseRadiusRatio: clampNumber(0.255 + layoutRandom() * 0.055 + familyAdjustment.baseRadiusRatio, 0.22, 0.335),
        horizontalStretch: clampNumber(0.93 + layoutRandom() * 0.13 + familyAdjustment.horizontalStretch, 0.88, 1.16),
        verticalStretch: clampNumber(0.91 + layoutRandom() * 0.13 + familyAdjustment.verticalStretch, 0.88, 1.15),
        wobbleAmplitude: clampNumber(0.038 + effectRandom() * 0.042 + familyAdjustment.wobbleAmplitude, 0.022, 0.12),
        wobbleFrequencyOne: clampInteger(2 + Math.floor(effectRandom() * 3) + familyAdjustment.wobbleFrequency, 2, 7),
        wobbleFrequencyTwo: clampInteger(3 + Math.floor(layoutRandom() * 3) + familyAdjustment.wobbleFrequency, 3, 8),
        wobbleFrequencyThree: clampInteger(5 + Math.floor(effectRandom() * 3) + familyAdjustment.wobbleFrequency, 4, 9),
        ringCount: clampInteger(2 + Math.floor(effectRandom() * 3) + familyAdjustment.ringCount, 2, 5),
        sparkleCount: clampInteger(6 + Math.floor(effectRandom() * 7) + familyAdjustment.sparkleCount, 4, 16),
        haloCount: clampInteger(2 + Math.floor(layoutRandom() * 2) + familyAdjustment.haloCount, 1, 4),
        coreShiftX: (layoutRandom() - 0.5) * 0.08,
        coreShiftY: (effectRandom() - 0.5) * 0.08,
        highlightAngle: layoutRandom() * Math.PI * 2,
        bandRotation: effectRandom() * Math.PI * 2,
        pulseSpeed: 0.82 + effectRandom() * 0.72,
        haloBlurRatio: clampNumber(0.18 + layoutRandom() * 0.12 + familyAdjustment.haloBlurRatio, 0.16, 0.34),
        sheenStrength: clampNumber(0.46 + effectRandom() * 0.28 + familyAdjustment.sheenStrength, 0.38, 0.88),
    };
}

/**
 * Resolves the family-specific adjustments that keep the orb surface varied while still circular.
 *
 * @param family Selected orb family.
 * @returns Family-specific profile adjustments.
 *
 * @private helper of `orbAvatarVisual`
 */
function resolveOrbFamilyAdjustment(family: OrbFamily): {
    readonly baseRadiusRatio: number;
    readonly horizontalStretch: number;
    readonly verticalStretch: number;
    readonly wobbleAmplitude: number;
    readonly wobbleFrequency: number;
    readonly ringCount: number;
    readonly sparkleCount: number;
    readonly haloCount: number;
    readonly haloBlurRatio: number;
    readonly sheenStrength: number;
} {
    switch (family) {
        case 'nebula':
            return {
                baseRadiusRatio: 0.006,
                horizontalStretch: 0.05,
                verticalStretch: -0.01,
                wobbleAmplitude: 0.012,
                wobbleFrequency: 1,
                ringCount: 1,
                sparkleCount: 2,
                haloCount: 0,
                haloBlurRatio: 0.02,
                sheenStrength: 0.08,
            };
        case 'ember':
            return {
                baseRadiusRatio: -0.004,
                horizontalStretch: -0.03,
                verticalStretch: 0.03,
                wobbleAmplitude: 0.02,
                wobbleFrequency: 1,
                ringCount: 0,
                sparkleCount: 3,
                haloCount: 0,
                haloBlurRatio: 0.04,
                sheenStrength: 0.06,
            };
        case 'glacier':
            return {
                baseRadiusRatio: 0.012,
                horizontalStretch: 0.01,
                verticalStretch: 0.02,
                wobbleAmplitude: -0.006,
                wobbleFrequency: -1,
                ringCount: 0,
                sparkleCount: 0,
                haloCount: 0,
                haloBlurRatio: -0.01,
                sheenStrength: 0.12,
            };
        case 'pearl':
        default:
            return {
                baseRadiusRatio: 0.02,
                horizontalStretch: 0.025,
                verticalStretch: 0.02,
                wobbleAmplitude: -0.01,
                wobbleFrequency: 0,
                ringCount: 0,
                sparkleCount: -1,
                haloCount: 1,
                haloBlurRatio: 0.02,
                sheenStrength: 0.1,
            };
    }
}

/**
 * Resolves the color set used by the orb renderer.
 *
 * @param palette Base avatar palette.
 * @param family Selected orb family.
 * @returns Derived orb-specific color set.
 *
 * @private helper of `orbAvatarVisual`
 */
function resolveOrbColorSet(palette: AvatarPalette, family: OrbFamily): OrbColorSet {
    const primaryColor = Color.fromSafe(palette.primary);
    const secondaryColor = Color.fromSafe(palette.secondary);
    const accentColor = Color.fromSafe(palette.accent);
    const highlightColor = Color.fromSafe(palette.highlight);
    const shadowColor = Color.fromSafe(palette.shadow);

    switch (family) {
        case 'nebula':
            return {
                core: accentColor.then(lighten(0.16)).then(saturate(0.14)).toHex(),
                mid: secondaryColor.then(lighten(0.08)).then(saturate(0.08)).toHex(),
                outer: primaryColor.then(darken(0.03)).then(saturate(0.04)).toHex(),
                rim: shadowColor.then(lighten(0.08)).toHex(),
                highlight: highlightColor.then(lighten(0.14)).toHex(),
                aura: secondaryColor.then(lighten(0.18)).toHex(),
            };
        case 'ember':
            return {
                core: accentColor.then(lighten(0.2)).then(saturate(0.16)).toHex(),
                mid: primaryColor.then(lighten(0.1)).then(saturate(0.08)).toHex(),
                outer: secondaryColor.then(darken(0.04)).then(saturate(0.04)).toHex(),
                rim: shadowColor.then(lighten(0.08)).toHex(),
                highlight: highlightColor.then(lighten(0.18)).toHex(),
                aura: accentColor.then(lighten(0.12)).toHex(),
            };
        case 'glacier':
            return {
                core: highlightColor.then(lighten(0.18)).then(saturate(-0.04)).toHex(),
                mid: secondaryColor.then(lighten(0.1)).then(saturate(-0.06)).toHex(),
                outer: primaryColor.then(lighten(0.06)).toHex(),
                rim: shadowColor.then(lighten(0.12)).toHex(),
                highlight: highlightColor.then(lighten(0.26)).toHex(),
                aura: primaryColor.then(lighten(0.18)).toHex(),
            };
        case 'pearl':
        default:
            return {
                core: highlightColor.then(lighten(0.2)).then(saturate(-0.06)).toHex(),
                mid: primaryColor.then(lighten(0.12)).then(saturate(-0.02)).toHex(),
                outer: secondaryColor.then(lighten(0.08)).then(saturate(-0.04)).toHex(),
                rim: shadowColor.then(lighten(0.12)).toHex(),
                highlight: highlightColor.then(lighten(0.3)).toHex(),
                aura: highlightColor.then(lighten(0.18)).toHex(),
            };
    }
}

/**
 * Creates the orb silhouette points from the deterministic profile.
 *
 * @param options Orb geometry options.
 * @returns Smoothly varying orb outline.
 *
 * @private helper of `orbAvatarVisual`
 */
function createOrbSilhouettePoints(options: {
    readonly centerX: number;
    readonly centerY: number;
    readonly radius: number;
    readonly profile: OrbMorphologyProfile;
    readonly timeMs: number;
}): Array<OrbPoint> {
    const { centerX, centerY, radius, profile, timeMs } = options;
    const pointCount = 48;

    return Array.from({ length: pointCount }, (_, pointIndex) => {
        const progress = pointIndex / pointCount;
        const angle = -Math.PI / 2 + progress * Math.PI * 2;
        const breathing =
            Math.sin(timeMs / (1450 / profile.pulseSpeed) + profile.bandRotation) * profile.wobbleAmplitude;
        const surfaceWaveOne =
            Math.sin(
                angle * profile.wobbleFrequencyOne + profile.highlightAngle + timeMs / (980 / profile.pulseSpeed),
            ) * profile.wobbleAmplitude;
        const surfaceWaveTwo =
            Math.cos(
                angle * profile.wobbleFrequencyTwo - profile.bandRotation * 0.8 + timeMs / (1320 / profile.pulseSpeed),
            ) *
            profile.wobbleAmplitude *
            0.62;
        const surfaceWaveThree =
            Math.sin(
                angle * profile.wobbleFrequencyThree +
                    profile.highlightAngle * 1.4 -
                    timeMs / (1710 / profile.pulseSpeed),
            ) *
            profile.wobbleAmplitude *
            0.38;
        const surfaceTaper = Math.sin(angle * 2 + profile.highlightAngle) * profile.wobbleAmplitude * 0.2;
        const localRadius =
            radius * (1 + breathing * 0.12 + surfaceWaveOne + surfaceWaveTwo + surfaceWaveThree + surfaceTaper);

        return {
            x:
                centerX +
                Math.cos(angle) * localRadius * profile.horizontalStretch +
                Math.sin(angle * 3 + profile.highlightAngle + timeMs / 2100) * radius * 0.012,
            y:
                centerY +
                Math.sin(angle) * localRadius * profile.verticalStretch +
                Math.cos(angle * 2 - profile.highlightAngle + timeMs / 2400) * radius * 0.01,
        };
    });
}

/**
 * Draws the atmospheric glow behind the orb.
 *
 * @param context Canvas 2D context.
 * @param size Canvas size in CSS pixels.
 * @param centerX Orb center X coordinate.
 * @param centerY Orb center Y coordinate.
 * @param radius Orb base radius.
 * @param colorSet Derived orb color set.
 * @param profile Deterministic orb profile.
 * @param timeMs Current animation time in milliseconds.
 *
 * @private helper of `orbAvatarVisual`
 */
function drawOrbAtmosphere(
    context: CanvasRenderingContext2D,
    size: number,
    centerX: number,
    centerY: number,
    radius: number,
    colorSet: OrbColorSet,
    profile: OrbMorphologyProfile,
    timeMs: number,
): void {
    const atmosphereGradient = context.createRadialGradient(
        centerX,
        centerY,
        radius * 0.08,
        centerX,
        centerY,
        radius * (1.9 + profile.haloBlurRatio),
    );
    atmosphereGradient.addColorStop(0, `${colorSet.highlight}26`);
    atmosphereGradient.addColorStop(0.32, `${colorSet.aura}16`);
    atmosphereGradient.addColorStop(1, `${colorSet.aura}00`);

    context.save();
    context.globalCompositeOperation = 'screen';
    context.fillStyle = atmosphereGradient;
    context.fillRect(0, 0, size, size);

    for (let haloIndex = 0; haloIndex < profile.haloCount; haloIndex++) {
        const haloPulse = Math.sin(timeMs / (1200 + haloIndex * 180) + profile.highlightAngle) * radius * 0.025;
        const haloRadiusX = radius * (1.18 + haloIndex * 0.18) + haloPulse;
        const haloRadiusY = radius * (0.98 + haloIndex * 0.16) + haloPulse * 0.82;
        const haloGradient = context.createRadialGradient(
            centerX,
            centerY,
            radius * 0.12,
            centerX,
            centerY,
            haloRadiusX * 1.12,
        );
        haloGradient.addColorStop(0, `${colorSet.aura}${haloIndex === 0 ? '38' : '24'}`);
        haloGradient.addColorStop(0.5, `${colorSet.highlight}${haloIndex === 0 ? '1f' : '12'}`);
        haloGradient.addColorStop(1, `${colorSet.aura}00`);

        context.beginPath();
        context.ellipse(
            centerX,
            centerY,
            haloRadiusX,
            haloRadiusY,
            profile.highlightAngle * 0.12 + haloIndex * 0.2 + Math.sin(timeMs / 3800) * 0.04,
            0,
            Math.PI * 2,
        );
        context.fillStyle = haloGradient;
        context.fill();
    }

    context.restore();
}

/**
 * Draws the main orb body using the smooth silhouette path.
 *
 * @param context Canvas 2D context.
 * @param points Smooth orb outline points.
 * @param centerX Orb center X coordinate.
 * @param centerY Orb center Y coordinate.
 * @param radius Orb base radius.
 * @param colorSet Derived orb color set.
 * @param profile Deterministic orb profile.
 * @param size Canvas size in CSS pixels.
 *
 * @private helper of `orbAvatarVisual`
 */
function drawOrbBody(
    context: CanvasRenderingContext2D,
    points: ReadonlyArray<OrbPoint>,
    centerX: number,
    centerY: number,
    radius: number,
    colorSet: OrbColorSet,
    profile: OrbMorphologyProfile,
    size: number,
): void {
    const bodyGradient = context.createRadialGradient(
        centerX - radius * 0.22,
        centerY - radius * 0.24,
        radius * 0.05,
        centerX + radius * 0.02,
        centerY + radius * 0.1,
        radius * (1.14 + profile.haloBlurRatio * 0.3),
    );
    bodyGradient.addColorStop(0, `${colorSet.highlight}f8`);
    bodyGradient.addColorStop(0.22, `${colorSet.core}f2`);
    bodyGradient.addColorStop(0.58, `${colorSet.mid}e8`);
    bodyGradient.addColorStop(0.86, `${colorSet.outer}dc`);
    bodyGradient.addColorStop(1, `${colorSet.rim}ea`);

    context.save();
    traceSmoothClosedPath(context, points);
    context.shadowColor = `${colorSet.rim}aa`;
    context.shadowBlur = size * (0.06 + profile.haloBlurRatio * 0.15);
    context.fillStyle = bodyGradient;
    context.fill();
    context.restore();

    context.save();
    traceSmoothClosedPath(context, points);
    context.strokeStyle = `${colorSet.highlight}${profile.family === 'pearl' ? '72' : '58'}`;
    context.lineWidth = Math.max(1.2, size * 0.012);
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.stroke();
    context.restore();
}

/**
 * Draws the layered energy rings and soft internal gradients inside the orb.
 *
 * @param context Canvas 2D context.
 * @param centerX Orb center X coordinate.
 * @param centerY Orb center Y coordinate.
 * @param radius Orb base radius.
 * @param colorSet Derived orb color set.
 * @param profile Deterministic orb profile.
 * @param size Canvas size in CSS pixels.
 * @param timeMs Current animation time in milliseconds.
 *
 * @private helper of `orbAvatarVisual`
 */
function drawOrbInteriorRings(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    colorSet: OrbColorSet,
    profile: OrbMorphologyProfile,
    size: number,
    timeMs: number,
): void {
    const internalGradient = context.createRadialGradient(
        centerX - radius * 0.08,
        centerY - radius * 0.1,
        radius * 0.06,
        centerX,
        centerY,
        radius * (0.95 + profile.sheenStrength * 0.15),
    );
    internalGradient.addColorStop(0, `${colorSet.highlight}70`);
    internalGradient.addColorStop(0.48, `${colorSet.core}22`);
    internalGradient.addColorStop(1, `${colorSet.rim}00`);
    context.fillStyle = internalGradient;
    context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);

    for (let ringIndex = 0; ringIndex < profile.ringCount; ringIndex++) {
        const ringProgress = (ringIndex + 1) / (profile.ringCount + 1);
        const ringRadiusX = radius * (0.34 + ringProgress * 0.44);
        const ringRadiusY = radius * (0.28 + ringProgress * 0.38);
        const ringRotation =
            profile.highlightAngle * 0.24 +
            ringIndex * 0.4 +
            Math.sin(timeMs / (1800 + ringIndex * 180) + profile.bandRotation) * 0.08;

        context.beginPath();
        context.ellipse(
            centerX + Math.cos(profile.highlightAngle) * radius * 0.03,
            centerY + Math.sin(profile.highlightAngle) * radius * 0.02,
            ringRadiusX,
            ringRadiusY,
            ringRotation,
            0,
            Math.PI * 2,
        );
        context.strokeStyle = ringIndex % 2 === 0 ? `${colorSet.highlight}32` : `${colorSet.aura}24`;
        context.lineWidth = Math.max(1.2, size * (0.007 - ringIndex * 0.001));
        context.shadowColor = `${colorSet.highlight}55`;
        context.shadowBlur = size * 0.02;
        context.stroke();
    }
}

/**
 * Draws soft sparkles and seeded dust inside the orb.
 *
 * @param context Canvas 2D context.
 * @param centerX Orb center X coordinate.
 * @param centerY Orb center Y coordinate.
 * @param radius Orb base radius.
 * @param colorSet Derived orb color set.
 * @param profile Deterministic orb profile.
 * @param size Canvas size in CSS pixels.
 * @param createRandom Seeded random factory.
 * @param timeMs Current animation time in milliseconds.
 *
 * @private helper of `orbAvatarVisual`
 */
function drawOrbSparkles(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    colorSet: OrbColorSet,
    profile: OrbMorphologyProfile,
    size: number,
    createRandom: (salt: string) => () => number,
    timeMs: number,
): void {
    const sparkleStride = Math.max(1, Math.floor(profile.sparkleCount / 6));

    for (let sparkleIndex = 0; sparkleIndex < profile.sparkleCount; sparkleIndex++) {
        const sparkleRandom = createRandom(`orb-sparkle-${sparkleIndex}`);
        const sparkleAngle = sparkleRandom() * Math.PI * 2 + profile.highlightAngle * 0.4;
        const sparkleOrbitRadius = radius * (0.42 + sparkleRandom() * 0.55);
        const sparkleOrbitPulse = 0.92 + Math.sin(timeMs / (700 + sparkleIndex * 70) + profile.bandRotation) * 0.08;
        const sparkleCenterX =
            centerX + Math.cos(sparkleAngle + timeMs / (4600 / profile.pulseSpeed)) * sparkleOrbitRadius;
        const sparkleCenterY =
            centerY + Math.sin(sparkleAngle + timeMs / (4600 / profile.pulseSpeed)) * sparkleOrbitRadius;
        const sparkleRadius = size * (0.0028 + sparkleRandom() * 0.0058) * sparkleOrbitPulse;

        context.beginPath();
        context.arc(sparkleCenterX, sparkleCenterY, sparkleRadius * 2, 0, Math.PI * 2);
        context.fillStyle = `${colorSet.highlight}14`;
        context.fill();

        context.beginPath();
        context.arc(sparkleCenterX, sparkleCenterY, sparkleRadius, 0, Math.PI * 2);
        context.fillStyle = sparkleIndex % sparkleStride === 0 ? `${colorSet.highlight}d2` : `${colorSet.aura}c8`;
        context.shadowColor = `${colorSet.highlight}66`;
        context.shadowBlur = size * 0.012;
        context.fill();
    }
}

/**
 * Draws the specular sweep that makes the orb feel glossy and dimensional.
 *
 * @param context Canvas 2D context.
 * @param centerX Orb center X coordinate.
 * @param centerY Orb center Y coordinate.
 * @param radius Orb base radius.
 * @param colorSet Derived orb color set.
 * @param profile Deterministic orb profile.
 * @param size Canvas size in CSS pixels.
 * @param timeMs Current animation time in milliseconds.
 *
 * @private helper of `orbAvatarVisual`
 */
function drawOrbSheen(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    colorSet: OrbColorSet,
    profile: OrbMorphologyProfile,
    size: number,
    timeMs: number,
): void {
    const sheenAngle = profile.bandRotation + timeMs / (2400 / profile.pulseSpeed);
    const sheenDirectionX = Math.cos(sheenAngle);
    const sheenDirectionY = Math.sin(sheenAngle);
    const sheenGradient = context.createLinearGradient(
        centerX - sheenDirectionX * radius,
        centerY - sheenDirectionY * radius,
        centerX + sheenDirectionX * radius,
        centerY + sheenDirectionY * radius,
    );
    sheenGradient.addColorStop(0, `${colorSet.highlight}00`);
    sheenGradient.addColorStop(0.24, `${colorSet.highlight}0e`);
    sheenGradient.addColorStop(0.43, `${colorSet.highlight}${profile.sheenStrength > 0.65 ? '66' : '48'}`);
    sheenGradient.addColorStop(0.57, `${colorSet.core}${profile.sheenStrength > 0.65 ? '42' : '2e'}`);
    sheenGradient.addColorStop(0.75, `${colorSet.aura}1e`);
    sheenGradient.addColorStop(1, `${colorSet.highlight}00`);

    context.fillStyle = sheenGradient;
    context.fillRect(centerX - radius * 1.6, centerY - radius * 1.6, radius * 3.2, radius * 3.2);

    context.beginPath();
    context.ellipse(
        centerX - radius * 0.18,
        centerY - radius * 0.2,
        radius * 0.44,
        radius * 0.24,
        profile.highlightAngle * 0.32,
        0,
        Math.PI * 2,
    );
    context.fillStyle = `${colorSet.highlight}${profile.family === 'ember' ? '26' : '2e'}`;
    context.shadowColor = `${colorSet.highlight}55`;
    context.shadowBlur = size * 0.02;
    context.fill();
}

/**
 * Draws the bright nucleus that gives the orb a recognisable center.
 *
 * @param context Canvas 2D context.
 * @param centerX Orb center X coordinate.
 * @param centerY Orb center Y coordinate.
 * @param radius Orb base radius.
 * @param colorSet Derived orb color set.
 * @param profile Deterministic orb profile.
 * @param size Canvas size in CSS pixels.
 * @param timeMs Current animation time in milliseconds.
 *
 * @private helper of `orbAvatarVisual`
 */
function drawOrbCore(
    context: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    colorSet: OrbColorSet,
    profile: OrbMorphologyProfile,
    size: number,
    timeMs: number,
): void {
    const coreRadiusX = radius * (0.18 + profile.sheenStrength * 0.06);
    const coreRadiusY = radius * (0.15 + profile.sheenStrength * 0.045);
    const corePulse = 1 + Math.sin(timeMs / (1100 / profile.pulseSpeed) + profile.bandRotation) * 0.04;

    context.beginPath();
    context.ellipse(
        centerX + profile.coreShiftX * radius * 0.18,
        centerY + profile.coreShiftY * radius * 0.18,
        coreRadiusX * corePulse,
        coreRadiusY * corePulse,
        profile.highlightAngle * 0.12,
        0,
        Math.PI * 2,
    );
    context.fillStyle = `${colorSet.core}f0`;
    context.shadowColor = `${colorSet.highlight}88`;
    context.shadowBlur = size * 0.03;
    context.fill();

    context.beginPath();
    context.arc(centerX - radius * 0.06, centerY - radius * 0.07, radius * 0.06, 0, Math.PI * 2);
    context.fillStyle = `${colorSet.highlight}d6`;
    context.fill();
}

/**
 * Draws the final rim stroke so the orb stays crisp against busy backgrounds.
 *
 * @param context Canvas 2D context.
 * @param points Smooth orb outline points.
 * @param colorSet Derived orb color set.
 * @param size Canvas size in CSS pixels.
 *
 * @private helper of `orbAvatarVisual`
 */
function drawOrbRim(
    context: CanvasRenderingContext2D,
    points: ReadonlyArray<OrbPoint>,
    colorSet: OrbColorSet,
    size: number,
): void {
    context.save();
    traceSmoothClosedPath(context, points);
    context.strokeStyle = `${colorSet.rim}c0`;
    context.lineWidth = Math.max(1.25, size * 0.013);
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.shadowColor = `${colorSet.highlight}4f`;
    context.shadowBlur = size * 0.018;
    context.stroke();
    context.restore();
}

/**
 * Clamps a number into the provided range.
 *
 * @param value Number to clamp.
 * @param minimum Minimum accepted value.
 * @param maximum Maximum accepted value.
 * @returns Clamped number.
 *
 * @private helper of `orbAvatarVisual`
 */
function clampNumber(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Clamps a number into the provided integer range.
 *
 * @param value Number to clamp.
 * @param minimum Minimum accepted value.
 * @param maximum Maximum accepted value.
 * @returns Clamped integer.
 *
 * @private helper of `orbAvatarVisual`
 */
function clampInteger(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, Math.round(value)));
}
