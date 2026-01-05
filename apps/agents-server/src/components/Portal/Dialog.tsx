'use client';

import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

type DialogProps = {
    children: ReactNode;
    isOpen?: boolean;
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
    const { children, isOpen = true, onClose, className = '', containerId = 'portal-root' } = props;
    const [container, setContainer] = useState<Element | null>(null);

    useEffect(() => {
        const element = document.getElementById(containerId);
        setContainer(element);
    }, [containerId]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
        }
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen || !container) {
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
