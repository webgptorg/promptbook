'use client';

import { useEffect, useMemo, useRef } from 'react';
import {
    createAvatarDefinitionKey,
    createAvatarInteractionRuntimeState,
    createIdleAvatarInteractionState,
    resolveAvatarPointerTarget,
    stepAvatarInteractionRuntimeState,
} from './avatarInteractionUtils';
import { getAvatarPointerSnapshot, retainAvatarPointerTracking } from './avatarPointerTracking';
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
    const { avatarDefinition, visualId, surface = 'framed', size = DEFAULT_AVATAR_SIZE, title, className, style } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationStartRef = useRef<number | null>(null);
    const interactionRuntimeStateRef = useRef(createAvatarInteractionRuntimeState());
    const avatarColorsKey = avatarDefinition.colors.join('|');
    const normalizedAvatarDefinition = useMemo(
        () => normalizeAvatarDefinition(avatarDefinition),
        [avatarDefinition.agentHash, avatarDefinition.agentName, avatarColorsKey],
    );
    const avatarDefinitionKey = useMemo(
        () => createAvatarDefinitionKey(normalizedAvatarDefinition),
        [normalizedAvatarDefinition.agentHash, normalizedAvatarDefinition.agentName, normalizedAvatarDefinition.colors.join('|')],
    );
    const avatarVisual = useMemo(() => getAvatarVisualById(visualId), [visualId]);

    useEffect(() => {
        interactionRuntimeStateRef.current = createAvatarInteractionRuntimeState();
    }, [avatarDefinitionKey, visualId]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            throw new Error('Avatar canvas is not mounted.');
        }

        const isDynamicAvatar = avatarVisual.isAnimated || avatarVisual.supportsPointerTracking === true;
        const releasePointerTracking = avatarVisual.supportsPointerTracking ? retainAvatarPointerTracking() : null;
        let animationFrameId: number | null = null;
        if (animationStartRef.current === null) {
            animationStartRef.current = performance.now();
        }

        const renderFrame = (now: number) => {
            const pointerSnapshot = avatarVisual.supportsPointerTracking ? getAvatarPointerSnapshot() : null;
            let interactionState = createIdleAvatarInteractionState();

            if (avatarVisual.supportsPointerTracking && pointerSnapshot) {
                interactionRuntimeStateRef.current = stepAvatarInteractionRuntimeState(
                    interactionRuntimeStateRef.current,
                    resolveAvatarPointerTarget(canvas.getBoundingClientRect(), pointerSnapshot),
                    now,
                );
                interactionState = interactionRuntimeStateRef.current;
            } else if (avatarVisual.supportsPointerTracking) {
                interactionRuntimeStateRef.current = stepAvatarInteractionRuntimeState(
                    interactionRuntimeStateRef.current,
                    createIdleAvatarInteractionState(),
                    now,
                );
                interactionState = interactionRuntimeStateRef.current;
            }

            renderAvatarVisual({
                canvas,
                avatarDefinition: normalizedAvatarDefinition,
                visualId,
                surface,
                size,
                timeMs: now - animationStartRef.current!,
                devicePixelRatio: window.devicePixelRatio || 1,
                interaction: interactionState,
            });

            if (isDynamicAvatar) {
                animationFrameId = window.requestAnimationFrame(renderFrame);
            }
        };

        renderFrame(performance.now());

        return () => {
            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
            }

            releasePointerTracking?.();
        };
    }, [
        avatarDefinitionKey,
        avatarVisual.isAnimated,
        avatarVisual.supportsPointerTracking,
        normalizedAvatarDefinition,
        size,
        surface,
        visualId,
    ]);

    return (
        <canvas
            ref={canvasRef}
            title={title || `${normalizedAvatarDefinition.agentName} avatar`}
            className={className}
            style={{
                width: size,
                height: size,
                display: 'block',
                borderRadius: surface === 'transparent' ? 0 : size * AVATAR_CANVAS_RADIUS_RATIO,
                ...style,
            }}
        />
    );
}
