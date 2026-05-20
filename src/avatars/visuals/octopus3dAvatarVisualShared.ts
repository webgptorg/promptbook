/* eslint-disable no-magic-numbers */

import type { AvatarPalette } from '../types/AvatarVisualDefinition';
import {
    clampNumber,
    getProjectedQuadPerimeter,
    projectScenePoint,
    transformScenePoint,
    type Point3D,
    type ProjectedPoint,
} from './avatar3dProjectionShared';
import type { Octopus3MorphologyProfile } from './octopus3AvatarVisual';
import { resolveOrganicEyeMotion } from './octopusAvatarVisualShared';

// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * One visible projected surface patch on an organic octopus mesh.
 *
 * @private helper of the 3D octopus avatar visuals
 */
export type Octopus3dSurfacePatch = {
    readonly corners: [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];
    readonly averageDepth: number;
    readonly lightIntensity: number;
    readonly fillStyle: string;
    readonly outlineColor: string;
};

/**
 * Resolves the front surface depth on an ellipsoid for one local face point.
 *
 * @param radiusX Horizontal ellipsoid radius.
 * @param radiusY Vertical ellipsoid radius.
 * @param radiusZ Depth ellipsoid radius.
 * @param x Local X coordinate.
 * @param y Local Y coordinate.
 * @returns Front-facing Z depth.
 *
 * @private helper of the 3D octopus avatar visuals
 */
export function resolveEllipsoidSurfaceDepth(
    radiusX: number,
    radiusY: number,
    radiusZ: number,
    x: number,
    y: number,
): number {
    const normalizedX = x / radiusX;
    const normalizedY = y / radiusY;
    const remainingDepthRatio = Math.max(0, 1 - normalizedX * normalizedX - normalizedY * normalizedY);

    return Math.sqrt(remainingDepthRatio) * radiusZ;
}

/**
 * Resolves one base fill tone for a surface patch across an organic 3D octopus body.
 *
 * @param palette Derived avatar palette.
 * @param verticalProgress Vertical surface progress in the range `[0, 1]`.
 * @returns Canvas fill style.
 *
 * @private helper of the 3D octopus avatar visuals
 */
export function resolveOrganic3dSurfacePatchFillStyle(palette: AvatarPalette, verticalProgress: number): string {
    const clampedVerticalProgress = clampNumber(verticalProgress, 0, 1);

    if (clampedVerticalProgress < 0.2) {
        return palette.highlight;
    }
    if (clampedVerticalProgress < 0.45) {
        return palette.secondary;
    }
    if (clampedVerticalProgress < 0.8) {
        return palette.primary;
    }

    return `${palette.shadow}f2`;
}

/**
 * Draws one projected mesh patch with organic shading.
 *
 * @param context Canvas 2D context.
 * @param surfacePatch Visible projected surface patch.
 *
 * @private helper of the 3D octopus avatar visuals
 */
export function drawOctopus3dSurfacePatch(
    context: CanvasRenderingContext2D,
    surfacePatch: Octopus3dSurfacePatch,
): void {
    drawProjectedQuad(context, surfacePatch.corners, surfacePatch.fillStyle);

    if (surfacePatch.lightIntensity > 0) {
        drawProjectedQuad(context, surfacePatch.corners, `rgba(255, 255, 255, ${0.15 * surfacePatch.lightIntensity})`);
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
    context.lineWidth = Math.max(1, getProjectedQuadPerimeter(surfacePatch.corners) * 0.0044);
    context.lineJoin = 'round';
    context.stroke();
    context.restore();
}

/**
 * Draws one projected eye on a turned octopus mantle.
 *
 * @param context Canvas 2D context.
 * @param localCenter Eye center in local mesh coordinates.
 * @param radiusX Eye horizontal radius in local coordinates.
 * @param radiusY Eye vertical radius in local coordinates.
 * @param center Mesh center in scene coordinates.
 * @param rotationX Mesh pitch in radians.
 * @param rotationY Mesh yaw in radians.
 * @param sceneCenterX Horizontal scene center.
 * @param sceneCenterY Vertical scene center.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 * @param timeMs Current animation time in milliseconds.
 * @param phase Seed-based animation phase.
 * @param interaction Smoothed pointer interaction state.
 * @param eyeStyle Seeded eye-style traits.
 *
 * @private helper of the 3D octopus avatar visuals
 */
export function drawProjectedOctopusEye(
    context: CanvasRenderingContext2D,
    localCenter: Point3D,
    radiusX: number,
    radiusY: number,
    center: Point3D,
    rotationX: number,
    rotationY: number,
    sceneCenterX: number,
    sceneCenterY: number,
    size: number,
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
    const centerScenePoint = transformScenePoint(localCenter, center, rotationX, rotationY);
    if (centerScenePoint.z <= center.z) {
        return;
    }

    const horizontalScenePoint = transformScenePoint(
        { x: localCenter.x + radiusX, y: localCenter.y, z: localCenter.z },
        center,
        rotationX,
        rotationY,
    );
    const verticalScenePoint = transformScenePoint(
        { x: localCenter.x, y: localCenter.y + radiusY, z: localCenter.z },
        center,
        rotationX,
        rotationY,
    );
    const projectedCenterPoint = projectScenePoint(centerScenePoint, size, sceneCenterX, sceneCenterY);
    const projectedHorizontalPoint = projectScenePoint(horizontalScenePoint, size, sceneCenterX, sceneCenterY);
    const projectedVerticalPoint = projectScenePoint(verticalScenePoint, size, sceneCenterX, sceneCenterY);
    const projectedRadiusX = Math.hypot(
        projectedHorizontalPoint.x - projectedCenterPoint.x,
        projectedHorizontalPoint.y - projectedCenterPoint.y,
    );
    const projectedRadiusY = Math.hypot(
        projectedVerticalPoint.x - projectedCenterPoint.x,
        projectedVerticalPoint.y - projectedCenterPoint.y,
    );

    if (projectedRadiusX < size * 0.008 || projectedRadiusY < size * 0.008) {
        return;
    }

    const { pupilOffsetX, pupilOffsetY } = resolveOrganicEyeMotion({
        radiusX: projectedRadiusX,
        radiusY: projectedRadiusY,
        timeMs,
        phase,
        interaction,
    });
    const rotation = Math.atan2(
        projectedHorizontalPoint.y - projectedCenterPoint.y,
        projectedHorizontalPoint.x - projectedCenterPoint.x,
    );

    context.save();
    context.translate(projectedCenterPoint.x, projectedCenterPoint.y);
    context.rotate(rotation);
    context.beginPath();
    context.ellipse(0, 0, projectedRadiusX, projectedRadiusY, 0, 0, Math.PI * 2);
    context.fillStyle = '#f8fbff';
    context.fill();
    context.clip();

    const irisGradient = context.createRadialGradient(
        -projectedRadiusX * 0.2,
        -projectedRadiusY * 0.26,
        projectedRadiusX * 0.05,
        0,
        0,
        projectedRadiusX * 0.92,
    );
    irisGradient.addColorStop(0, palette.highlight);
    irisGradient.addColorStop(0.56, palette.secondary);
    irisGradient.addColorStop(1, palette.shadow);
    context.beginPath();
    context.ellipse(
        pupilOffsetX,
        pupilOffsetY,
        projectedRadiusX * 0.62 * eyeStyle.irisScale,
        projectedRadiusY * 0.72 * eyeStyle.irisScale,
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
        projectedRadiusX * 0.15 * eyeStyle.pupilWidthScale,
        projectedRadiusY * 0.48 * eyeStyle.pupilHeightScale,
        0,
        0,
        Math.PI * 2,
    );
    context.fillStyle = palette.ink;
    context.fill();

    context.beginPath();
    context.ellipse(
        pupilOffsetX - projectedRadiusX * 0.22,
        pupilOffsetY - projectedRadiusY * 0.24,
        projectedRadiusX * 0.12,
        projectedRadiusY * 0.14,
        0,
        0,
        Math.PI * 2,
    );
    context.fillStyle = '#ffffff';
    context.fill();
    context.restore();

    context.save();
    context.translate(projectedCenterPoint.x, projectedCenterPoint.y);
    context.rotate(rotation);
    context.beginPath();
    context.ellipse(0, 0, projectedRadiusX, projectedRadiusY, 0, 0, Math.PI * 2);
    context.strokeStyle = `${palette.shadow}cc`;
    context.lineWidth = projectedRadiusX * 0.16;
    context.stroke();

    context.beginPath();
    context.moveTo(-projectedRadiusX * 0.88, -projectedRadiusY * eyeStyle.upperLidInsetRatio);
    context.quadraticCurveTo(
        0,
        -projectedRadiusY * (eyeStyle.upperLidArchRatio - interaction.gazeY * 0.16 + interaction.intensity * 0.08),
        projectedRadiusX * 0.88,
        -projectedRadiusY * eyeStyle.upperLidInsetRatio,
    );
    context.strokeStyle = `${palette.shadow}73`;
    context.lineWidth = projectedRadiusX * 0.14;
    context.lineCap = 'round';
    context.stroke();

    if (eyeStyle.lowerLidOpacity > 0) {
        context.beginPath();
        context.moveTo(-projectedRadiusX * 0.74, projectedRadiusY * 0.2);
        context.quadraticCurveTo(0, projectedRadiusY * 0.38, projectedRadiusX * 0.74, projectedRadiusY * 0.2);
        context.strokeStyle = `${palette.highlight}${formatAlphaHex(eyeStyle.lowerLidOpacity)}`;
        context.lineWidth = projectedRadiusX * 0.08;
        context.lineCap = 'round';
        context.stroke();
    }

    context.restore();
}

/**
 * Draws a subtle projected mouth arc across the front of a turned mantle.
 *
 * @param context Canvas 2D context.
 * @param localPoints Three local mesh-space points defining the mouth curve.
 * @param center Mesh center in scene coordinates.
 * @param rotationX Mesh pitch in radians.
 * @param rotationY Mesh yaw in radians.
 * @param sceneCenterX Horizontal scene center.
 * @param sceneCenterY Vertical scene center.
 * @param palette Derived avatar palette.
 * @param size Canvas size in CSS pixels.
 *
 * @private helper of the 3D octopus avatar visuals
 */
export function drawProjectedOctopusMouth(
    context: CanvasRenderingContext2D,
    localPoints: readonly [Point3D, Point3D, Point3D],
    center: Point3D,
    rotationX: number,
    rotationY: number,
    sceneCenterX: number,
    sceneCenterY: number,
    palette: AvatarPalette,
    size: number,
): void {
    const scenePoints = localPoints.map((localPoint) =>
        transformScenePoint(localPoint, center, rotationX, rotationY),
    ) as [Point3D, Point3D, Point3D];

    if (scenePoints.some((scenePoint) => scenePoint.z <= center.z)) {
        return;
    }

    const projectedPoints = scenePoints.map((scenePoint) =>
        projectScenePoint(scenePoint, size, sceneCenterX, sceneCenterY),
    ) as [ProjectedPoint, ProjectedPoint, ProjectedPoint];
    context.beginPath();
    context.moveTo(projectedPoints[0].x, projectedPoints[0].y);
    context.quadraticCurveTo(projectedPoints[1].x, projectedPoints[1].y, projectedPoints[2].x, projectedPoints[2].y);
    context.strokeStyle = `${palette.ink}b8`;
    context.lineWidth = Math.max(1.1, size * 0.009);
    context.lineCap = 'round';
    context.stroke();
}

/**
 * Draws one filled projected quad.
 *
 * @param context Canvas 2D context.
 * @param corners Quad corners in clockwise order.
 * @param fillStyle Canvas fill style.
 *
 * @private helper of the 3D octopus avatar visuals
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
 * Converts an opacity ratio into a two-digit hexadecimal alpha suffix.
 *
 * @param opacity Opacity ratio in the range `[0, 1]`.
 * @returns Two-digit hexadecimal alpha string.
 *
 * @private helper of the 3D octopus avatar visuals
 */
function formatAlphaHex(opacity: number): string {
    return Math.round(clampNumber(opacity, 0, 1) * 255)
        .toString(16)
        .padStart(2, '0');
}
