import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Tooltip.module.css';

interface TooltipProps {
    /**
     * The content to display in the tooltip
     */
    content: string;

    /**
     * The element that triggers the tooltip
     */
    children: ReactNode;

    /**
     * The position of the tooltip relative to the trigger element
     * @default "top"
     */
    position?: 'top' | 'right' | 'bottom' | 'left';

    /**
     * Optional delay before showing the tooltip (in milliseconds)
     * @default 0
     */
    delay?: number;

    /**
     * Render the tooltip wrapper as a block-level element that spans full width.
     * Useful when wrapping grid/list items so the clickable area matches the visual card.
     * @default false
     */
    block?: boolean;

    /**
     * Enable tooltip on touch devices. By default tooltips are disabled on touch to avoid
     * stealing clicks from the underlying element (eg. agent card selection).
     * @default false
     */
    isEnabledOnTouch?: boolean;

    /**
     * If true, the tooltip will not be displayed but the content will still be rendered.
     * In this case <Tooltip> is equivalent to a <React.Fragment> with the content.
     *
     * Note: Tooltip sometimes breaks the hover, temporarly disable via this prop
     */
    isDisabled?: boolean;
}

/**
 * A tooltip component that displays additional information when hovering over an element
 */
export function Tooltip({
    content,
    children,
    position = 'top',
    delay = 0,
    block = false,
    isEnabledOnTouch: enableOnTouch = false,
    isDisabled = false,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);

    // Detect if the environment supports hover (desktop/mouse) vs touch
    const supportsHover =
        typeof window !== 'undefined' &&
        'matchMedia' in window &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    const calculatePosition = useCallback(() => {
        if (!triggerRef.current) return;

        const triggerRect = triggerRef.current.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        let top = 0;
        let left = 0;

        switch (position) {
            case 'top':
                top = triggerRect.top + scrollY - 8; // 8px offset for spacing
                left = triggerRect.left + scrollX + triggerRect.width / 2;
                break;
            case 'bottom':
                top = triggerRect.bottom + scrollY + 8;
                left = triggerRect.left + scrollX + triggerRect.width / 2;
                break;
            case 'left':
                top = triggerRect.top + scrollY + triggerRect.height / 2;
                left = triggerRect.left + scrollX - 8;
                break;
            case 'right':
                top = triggerRect.top + scrollY + triggerRect.height / 2;
                left = triggerRect.right + scrollX + 8;
                break;
        }

        setTooltipPosition({ top, left });
    }, [position]);

    const showTooltip = () => {
        // Avoid showing tooltip on touch devices unless explicitly enabled
        if (!supportsHover && !enableOnTouch) {
            return;
        }

        calculatePosition();
        if (delay > 0) {
            const id = setTimeout(() => setIsVisible(true), delay);
            setTimeoutId(id);
        } else {
            setIsVisible(true);
        }
    };

    const hideTooltip = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
        setIsVisible(false);
    };

    useEffect(() => {
        if (isVisible) {
            const handleScroll = () => calculatePosition();
            const handleResize = () => calculatePosition();

            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('scroll', handleScroll, true);
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [isVisible, calculatePosition, position]);

    if (isDisabled) {
        return <>{children}</>;
    }

    const tooltipElement = isVisible ? (
        <div
            className={`${styles.tooltip} ${styles[position]} ${styles.portal}`}
            style={{
                top: tooltipPosition.top,
                left: tooltipPosition.left,
            }}
        >
            {content}
        </div>
    ) : null;

    return (
        <>
            <div
                ref={triggerRef}
                className={`${styles.tooltipContainer} ${block ? styles.blockContainer : ''}`}
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
                onFocus={showTooltip}
                onBlur={hideTooltip}
            >
                {children}
            </div>
            {typeof document !== 'undefined' && tooltipElement && createPortal(tooltipElement, document.body)}
        </>
    );
}
