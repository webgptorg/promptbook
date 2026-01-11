'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

type DialogProps = {
    children: ReactNode;
    onClose: () => void;
    className?: string;
    containerId?: string;
};

/**
 * A reusable Dialog component that:
 * 1. Renders via Portal
 * 2. Closes on click outside
 * 3. Closes on Escape key
 * 4. Prevents body scroll when open
 */
export function Dialog(props: DialogProps) {
    const { children, onClose, className = '', containerId = 'portal-root' } = props;
    const [container, setContainer] = useState<Element | null>(null);

    useEffect(() => {
        const element = document.getElementById(containerId);
        setContainer(element);
    }, [containerId]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    if (!container) {
        return null;
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className={`relative bg-white rounded-lg shadow-lg border border-gray-200 animate-in zoom-in-95 duration-200 ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>,
        container,
    );
}
