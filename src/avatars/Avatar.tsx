'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { AvatarProps } from './types/AvatarVisualDefinition';
import { renderAvatarVisual } from './renderAvatarVisual';
import { getAvatarVisualById } from './visuals/avatarVisualRegistry';
import { DEFAULT_AVATAR_SIZE, normalizeAvatarDefinition } from './avatarRenderingUtils';

/**
 * Border radius ratio for the shared avatar canvas.
 *
 * @private helper of `<Avatar/>`
 */
const AVATAR_CANVAS_RADIUS_RATIO = 0.18;

/**
 * Canvas-based deterministic avatar component.
 *
 * @private shared component for in-repository avatar previews
 */
export function Avatar(props: AvatarProps) {
    const { avatarDefinition, visualId, size = DEFAULT_AVATAR_SIZE, title, className, style } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const normalizedAvatarDefinition = useMemo(() => normalizeAvatarDefinition(avatarDefinition), [avatarDefinition]);
    const avatarVisual = useMemo(() => getAvatarVisualById(visualId), [visualId]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            throw new Error('Avatar canvas is not mounted.');
        }

        let animationFrameId: number | null = null;
        const animationStart = performance.now();

        const renderFrame = (now: number) => {
            renderAvatarVisual({
                canvas,
                avatarDefinition: normalizedAvatarDefinition,
                visualId,
                size,
                timeMs: now - animationStart,
                devicePixelRatio: window.devicePixelRatio || 1,
            });

            if (avatarVisual.isAnimated) {
                animationFrameId = window.requestAnimationFrame(renderFrame);
            }
        };

        renderFrame(animationStart);

        return () => {
            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
            }
        };
    }, [avatarVisual.isAnimated, normalizedAvatarDefinition, size, visualId]);

    return (
        <canvas
            ref={canvasRef}
            title={title || `${normalizedAvatarDefinition.agentName} avatar`}
            className={className}
            style={{
                width: size,
                height: size,
                display: 'block',
                borderRadius: size * AVATAR_CANVAS_RADIUS_RATIO,
                ...style,
            }}
        />
    );
}
