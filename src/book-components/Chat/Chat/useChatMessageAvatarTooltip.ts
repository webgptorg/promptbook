'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Absolute screen position used for the avatar profile tooltip.
 *
 * @private internal helper of `<ChatMessageItem/>`
 */
type AvatarTooltipPosition = {
    readonly top: number;
    readonly left: number;
};

/**
 * State and handlers used by the avatar profile tooltip behavior.
 *
 * @private internal hook of `<ChatMessageItem/>`
 */
export type UseChatMessageAvatarTooltipResult = {
    readonly avatarRef: RefObject<HTMLDivElement | null>;
    readonly tooltipRef: RefObject<HTMLDivElement | null>;
    readonly isAvatarTooltipVisible: boolean;
    readonly avatarTooltipPosition: AvatarTooltipPosition | null;
    readonly showTooltip: () => void;
    readonly handleMouseEnter: () => void;
    readonly handleMouseLeave: () => void;
};

/**
 * Manages delayed avatar tooltip display and outside-dismiss behavior.
 *
 * @private internal hook of `<ChatMessageItem/>`
 */
export function useChatMessageAvatarTooltip(): UseChatMessageAvatarTooltipResult {
    const [isAvatarTooltipVisible, setIsAvatarTooltipVisible] = useState(false);
    const [avatarTooltipPosition, setAvatarTooltipPosition] = useState<AvatarTooltipPosition | null>(null);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const avatarRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const closeTooltip = useCallback(() => {
        setIsAvatarTooltipVisible(false);
        setAvatarTooltipPosition(null);
    }, []);

    const showTooltip = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        if (avatarRef.current) {
            const rect = avatarRef.current.getBoundingClientRect();
            setAvatarTooltipPosition({
                top: rect.bottom + 5,
                left: rect.left,
            });
            setIsAvatarTooltipVisible(true);
        }
    }, []);

    const handleMouseEnter = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        hoverTimeoutRef.current = setTimeout(showTooltip, 800);
    }, [showTooltip]);

    const handleMouseLeave = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                avatarRef.current &&
                !avatarRef.current.contains(event.target as Node) &&
                tooltipRef.current &&
                !tooltipRef.current.contains(event.target as Node)
            ) {
                closeTooltip();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeTooltip();
            }
        };

        const handleScroll = () => {
            closeTooltip();
        };

        if (isAvatarTooltipVisible) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
            window.addEventListener('scroll', handleScroll, true);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [closeTooltip, isAvatarTooltipVisible]);

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    return {
        avatarRef,
        tooltipRef,
        isAvatarTooltipVisible,
        avatarTooltipPosition,
        showTooltip,
        handleMouseEnter,
        handleMouseLeave,
    };
}
