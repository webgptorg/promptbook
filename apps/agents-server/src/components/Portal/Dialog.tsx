'use client';

import type { MouseEvent as ReactMouseEvent, ReactNode, TouchEvent as ReactTouchEvent } from 'react';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

/**
 * Default backdrop styling shared by Agents Server modal dialogs.
 */
const DEFAULT_DIALOG_BACKDROP_CLASS_NAME =
    'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/65 backdrop-blur-md animate-in fade-in duration-200';

/**
 * Default surface styling shared by Agents Server modal dialogs.
 */
const DEFAULT_DIALOG_SURFACE_CLASS_NAME =
    'relative bg-white rounded-lg shadow-lg border border-gray-200 animate-in zoom-in-95 duration-200';

/**
 * Maximum pointer travel still treated as one intentional backdrop click.
 */
const INTENTIONAL_BACKDROP_CLICK_MAX_MOVEMENT_PX = 8;

/**
 * Pointer-down metadata remembered until the matching pointer-up arrives.
 */
type DialogBackdropPointerGesture = {
    readonly clientX: number;
    readonly clientY: number;
};

/**
 * Props accepted by the shared portal-backed dialog.
 */
type DialogProps = {
    /**
     * Dialog body content.
     */
    readonly children: ReactNode;
    /**
     * Called when the dialog requests closing.
     */
    readonly onClose: () => void;
    /**
     * Additional surface classes merged with the shared modal surface.
     */
    readonly className?: string;
    /**
     * Additional backdrop classes merged with the shared modal backdrop.
     */
    readonly backdropClassName?: string;
    /**
     * Portal container element id.
     */
    readonly containerId?: string;
    /**
     * When false, backdrop clicks and Escape do not dismiss the dialog.
     */
    readonly isDismissible?: boolean;
    /**
     * When false, clicking the backdrop does not dismiss the dialog.
     */
    readonly isBackdropDismissible?: boolean;
    /**
     * When false, pressing Escape does not dismiss the dialog.
     */
    readonly isEscapeDismissible?: boolean;
    /**
     * Accessible dialog role.
     */
    readonly role?: 'alertdialog' | 'dialog';
    /**
     * Optional accessible label when no visible title is wired up.
     */
    readonly ariaLabel?: string;
    /**
     * Optional id of the dialog title element.
     */
    readonly ariaLabelledBy?: string;
    /**
     * Optional id of the dialog description element.
     */
    readonly ariaDescribedBy?: string;
};

/**
 * A reusable Dialog component that renders via a portal, can optionally close
 * on backdrop/Escape, and prevents body scroll while mounted.
 */
export function Dialog(props: DialogProps) {
    const {
        children,
        onClose,
        className = '',
        backdropClassName = '',
        containerId = 'portal-root',
        isDismissible = true,
        isBackdropDismissible = isDismissible,
        isEscapeDismissible = isDismissible,
        role = 'dialog',
        ariaLabel,
        ariaLabelledBy,
        ariaDescribedBy,
    } = props;
    const [container, setContainer] = useState<Element | null>(null);
    const backdropPointerGestureRef = useRef<DialogBackdropPointerGesture | null>(null);

    useEffect(() => {
        const element = document.getElementById(containerId);
        setContainer(element);
    }, [containerId]);

    useEffect(() => {
        const previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousBodyOverflow;
        };
    }, []);

    useEffect(() => {
        if (!isEscapeDismissible) {
            return;
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isEscapeDismissible, onClose]);

    if (!container) {
        return null;
    }

    /**
     * Arms one potential backdrop-dismiss gesture only when the press starts on the backdrop itself.
     */
    function handleBackdropMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
        if (!isBackdropDismissible || event.button !== 0 || event.target !== event.currentTarget) {
            backdropPointerGestureRef.current = null;
            return;
        }

        backdropPointerGestureRef.current = {
            clientX: event.clientX,
            clientY: event.clientY,
        };
    }

    /**
     * Closes the dialog only for deliberate click-like mouse sequences that both start and end on the backdrop.
     */
    function handleBackdropMouseUp(event: ReactMouseEvent<HTMLDivElement>) {
        if (!isBackdropDismissible || event.button !== 0 || event.target !== event.currentTarget) {
            backdropPointerGestureRef.current = null;
            return;
        }

        const backdropPointerGesture = backdropPointerGestureRef.current;
        backdropPointerGestureRef.current = null;

        if (!backdropPointerGesture) {
            return;
        }

        const horizontalMovement = Math.abs(event.clientX - backdropPointerGesture.clientX);
        const verticalMovement = Math.abs(event.clientY - backdropPointerGesture.clientY);
        const isIntentionalBackdropClick =
            horizontalMovement <= INTENTIONAL_BACKDROP_CLICK_MAX_MOVEMENT_PX &&
            verticalMovement <= INTENTIONAL_BACKDROP_CLICK_MAX_MOVEMENT_PX;

        if (isIntentionalBackdropClick) {
            onClose();
        }
    }

    /**
     * Arms one potential backdrop-dismiss gesture only when the touch starts on the backdrop itself.
     */
    function handleBackdropTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
        if (!isBackdropDismissible || event.target !== event.currentTarget) {
            backdropPointerGestureRef.current = null;
            return;
        }

        const touch = event.changedTouches[0];
        if (!touch) {
            backdropPointerGestureRef.current = null;
            return;
        }

        backdropPointerGestureRef.current = {
            clientX: touch.clientX,
            clientY: touch.clientY,
        };
    }

    /**
     * Closes the dialog only for deliberate touch sequences that both start and end on the backdrop.
     */
    function handleBackdropTouchEnd(event: ReactTouchEvent<HTMLDivElement>) {
        if (!isBackdropDismissible || event.target !== event.currentTarget) {
            backdropPointerGestureRef.current = null;
            return;
        }

        const backdropPointerGesture = backdropPointerGestureRef.current;
        const touch = event.changedTouches[0];
        backdropPointerGestureRef.current = null;

        if (!backdropPointerGesture || !touch) {
            return;
        }

        const horizontalMovement = Math.abs(touch.clientX - backdropPointerGesture.clientX);
        const verticalMovement = Math.abs(touch.clientY - backdropPointerGesture.clientY);
        const isIntentionalBackdropClick =
            horizontalMovement <= INTENTIONAL_BACKDROP_CLICK_MAX_MOVEMENT_PX &&
            verticalMovement <= INTENTIONAL_BACKDROP_CLICK_MAX_MOVEMENT_PX;

        if (isIntentionalBackdropClick) {
            onClose();
        }
    }

    return createPortal(
        <div
            className={`${DEFAULT_DIALOG_BACKDROP_CLASS_NAME} ${backdropClassName}`.trim()}
            onMouseDown={handleBackdropMouseDown}
            onMouseUp={handleBackdropMouseUp}
            onTouchStart={handleBackdropTouchStart}
            onTouchEnd={handleBackdropTouchEnd}
            onTouchCancel={() => {
                backdropPointerGestureRef.current = null;
            }}
        >
            <div
                role={role}
                aria-modal="true"
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledBy}
                aria-describedby={ariaDescribedBy}
                className={`${DEFAULT_DIALOG_SURFACE_CLASS_NAME} ${className}`.trim()}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>,
        container,
    );
}
