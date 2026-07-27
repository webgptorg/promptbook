'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { retainAvatarAnimationListener } from './avatarAnimationScheduler';
import {
    createAvatarDefinitionKey,
    createAvatarInteractionRuntimeState,
    createIdleAvatarInteractionState,
    resolveAvatarPointerTarget,
    stepAvatarInteractionRuntimeState,
} from './avatarInteractionUtils';
import {
    getAvatarPointerSnapshot,
    getAvatarPointerSnapshotVersion,
    getAvatarViewportLayoutVersion,
    retainAvatarPointerTracking,
} from './avatarPointerTracking';
import { DEFAULT_AVATAR_SIZE } from './avatarRenderingUtils';
import { observeAvatarVisibility } from './avatarVisibilityTracking';
import { renderAvatarVisual, resolveAvatarRenderDefinition } from './renderAvatarVisual';
import type { AvatarProps } from './types/AvatarVisualDefinition';

/**
 * Border radius ratio for the shared avatar canvas.
 *
 * @private helper of `<Avatar/>`
 */
const AVATAR_CANVAS_RADIUS_RATIO = 0.18;

/**
 * Maximum time between layout-bound refreshes while pointer tracking is active.
 *
 * This keeps pointer-aware visuals aligned with chat/layout shifts without forcing a layout read every frame.
 *
 * @private helper of `<Avatar/>`
 */
const ACTIVE_POINTER_BOUNDS_REFRESH_MS = 120;

/**
 * Canvas-based deterministic avatar component.
 *
 * @private shared component for in-repository avatar previews
 */
export function Avatar(props: AvatarProps) {
    const {
        avatarDefinition,
        visualId,
        surface = 'framed',
        size = DEFAULT_AVATAR_SIZE,
        title,
        className,
        style,
    } = props;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationStartRef = useRef<number | null>(null);
    const interactionRuntimeStateRef = useRef(createAvatarInteractionRuntimeState());
    const avatarBoundsRef = useRef<DOMRectReadOnly | null>(null);
    const lastResolvedPointerVersionRef = useRef<number>(-1);
    const lastResolvedViewportLayoutVersionRef = useRef<number>(-1);
    const lastAvatarBoundsRefreshAtRef = useRef<number>(0);
    const avatarColorsKey = avatarDefinition.colors.join('|');
    const resolvedAvatarRenderDefinition = useMemo(
        () =>
            resolveAvatarRenderDefinition({
                avatarDefinition,
                visualId,
                surface,
            }),
        [avatarDefinition.agentHash, avatarDefinition.agentName, avatarColorsKey, surface, visualId],
    );
    const avatarDefinitionKey = useMemo(
        () => createAvatarDefinitionKey(resolvedAvatarRenderDefinition.avatarDefinition),
        [
            resolvedAvatarRenderDefinition.avatarDefinition.agentHash,
            resolvedAvatarRenderDefinition.avatarDefinition.agentName,
            resolvedAvatarRenderDefinition.avatarDefinition.colors.join('|'),
        ],
    );
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            throw new Error('Avatar canvas is not mounted.');
        }

        return observeAvatarVisibility(canvas, setIsVisible);
    }, []);

    useEffect(() => {
        interactionRuntimeStateRef.current = createAvatarInteractionRuntimeState();
        avatarBoundsRef.current = null;
        lastResolvedPointerVersionRef.current = -1;
        lastResolvedViewportLayoutVersionRef.current = -1;
        lastAvatarBoundsRefreshAtRef.current = 0;
    }, [avatarDefinitionKey, isVisible, visualId]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas || typeof ResizeObserver === 'undefined') {
            return;
        }

        const resizeObserver = new ResizeObserver(() => {
            avatarBoundsRef.current = null;
        });
        resizeObserver.observe(canvas);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            throw new Error('Avatar canvas is not mounted.');
        }

        const avatarVisual = resolvedAvatarRenderDefinition.avatarVisual;
        const isDynamicAvatar = avatarVisual.isAnimated || avatarVisual.supportsPointerTracking === true;
        const shouldTrackPointer = avatarVisual.supportsPointerTracking === true && isVisible;
        const releasePointerTracking = shouldTrackPointer ? retainAvatarPointerTracking() : null;
        if (animationStartRef.current === null) {
            animationStartRef.current = performance.now();
        }

        const renderFrame = (now: number) => {
            const pointerSnapshot = avatarVisual.supportsPointerTracking ? getAvatarPointerSnapshot() : null;
            let interactionState = createIdleAvatarInteractionState();

            if (avatarVisual.supportsPointerTracking && pointerSnapshot) {
                const pointerSnapshotVersion = getAvatarPointerSnapshotVersion();
                const viewportLayoutVersion = getAvatarViewportLayoutVersion();

                if (
                    avatarBoundsRef.current === null ||
                    lastResolvedPointerVersionRef.current !== pointerSnapshotVersion ||
                    lastResolvedViewportLayoutVersionRef.current !== viewportLayoutVersion ||
                    now - lastAvatarBoundsRefreshAtRef.current >= ACTIVE_POINTER_BOUNDS_REFRESH_MS
                ) {
                    avatarBoundsRef.current = canvas.getBoundingClientRect();
                    lastResolvedPointerVersionRef.current = pointerSnapshotVersion;
                    lastResolvedViewportLayoutVersionRef.current = viewportLayoutVersion;
                    lastAvatarBoundsRefreshAtRef.current = now;
                }

                interactionRuntimeStateRef.current = stepAvatarInteractionRuntimeState(
                    interactionRuntimeStateRef.current,
                    resolveAvatarPointerTarget(avatarBoundsRef.current, pointerSnapshot),
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

            renderAvatarVisual(
                {
                    canvas,
                    avatarDefinition: resolvedAvatarRenderDefinition.avatarDefinition,
                    visualId,
                    surface,
                    size,
                    timeMs: now - animationStartRef.current!,
                    devicePixelRatio: window.devicePixelRatio || 1,
                    interaction: interactionState,
                },
                resolvedAvatarRenderDefinition,
            );
        };

        renderFrame(performance.now());

        if (!isDynamicAvatar || !isVisible) {
            return () => {
                releasePointerTracking?.();
            };
        }

        const releaseAnimationListener = retainAvatarAnimationListener(renderFrame);

        return () => {
            releaseAnimationListener();
            releasePointerTracking?.();
        };
    }, [avatarDefinitionKey, isVisible, resolvedAvatarRenderDefinition, size, surface, visualId]);

    return (
        <canvas
            ref={canvasRef}
            title={title || `${resolvedAvatarRenderDefinition.avatarDefinition.agentName} avatar`}
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
