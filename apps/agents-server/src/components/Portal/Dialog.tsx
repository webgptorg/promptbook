'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

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
        role = 'dialog',
        ariaLabel,
        ariaLabelledBy,
        ariaDescribedBy,
    } = props;
    const [container, setContainer] = useState<Element | null>(null);

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
        if (!isDismissible) {
            return;
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isDismissible, onClose]);

    if (!container) {
        return null;
    }

    return createPortal(
        <div
            className={`${DEFAULT_DIALOG_BACKDROP_CLASS_NAME} ${backdropClassName}`.trim()}
            onClick={
                isDismissible
                    ? (event) => {
                          if (event.target === event.currentTarget) {
                              onClose();
                          }
                      }
                    : undefined
            }
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
