import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { classNames } from '../../../../src/book-components/_common/react-utils/classNames';
import { string_css_class, string_name } from '../../../../src/types/typeAliases';
import { just } from '../../../../src/utils/organization/just';
import { TODO_USE } from '../../../../src/utils/organization/TODO_USE';
import styles from './ResizablePanels.module.css';

type ResizablePanelsProps = {
    /**
     * Content of panels
     */
    readonly children: Array<ReactNode>;

    /**
     * Direction of panels
     */
    readonly direction: 'HORIZONTAL' | 'VERTICAL';

    /**
     * Direction of panels
     */
    readonly isReversed?: boolean;

    /**
     * Unique identifier of the panel to persist its size
     */
    readonly name: string_name;

    /**
     * Optional function to get the initial size of a panel
     *
     * Note: Last panel will be sized to fill the remaining space
     *
     * @param panelInfo Information about panel which you can use to determine size
     * @returns Initial size (width or height according to direction) of panel
     * @default {function} That evenly divides the container size among all panels (excluding dividers) - just returns `evenPanelSize`
     */
    getPanelInitialSize?(panelInfo: {
        /**
         * Index of thepanel
         *
         * Note: Last panel will be sized to fill the remaining space so this will always itterate from 0 to `panelCount - 2`
         *      (i.e. it will never be the index of the last panel)
         */
        readonly index: number;

        /**
         * Full size of container
         */
        readonly fullContainerSize: number;

        /**
         * Size of the divider
         */
        readonly dividerSize: number;

        /**
         * Number of panels
         */
        readonly panelCount: number;

        /**
         * Size of the panel in case of even distribution for all panels
         */
        readonly evenPanelSize: number;

        /**
         * Remaining size of the container
         */
        readonly remainingSize: number;

        /**
         * Size of the panel in case of even distribution for remaining panels
         */
        readonly remainingEvenSize: number;
    }): number;

    /**
     * Optional function to resize the panel when the container is resized
     *
     * Note: Last panel will be sized to fill the remaining space
     *
     * @param panelInfo Information about panel which you can use to determine new size
     * @returns New size (width or height according to direction) of panel
     * @default {function} That keeps the ratio of sizes of all panels same
     */
    getPanelResize?(panelInfo: {
        /**
         * Index of thepanel
         *
         * Note: Last panel will be sized to fill the remaining space so this will always itterate from 0 to `panelCount - 2`
         *      (i.e. it will never be the index of the last panel)
         */
        readonly index: number;

        /**
         * Full size of container
         */
        readonly fullContainerSize: number;

        /**
         * Size of the divider
         */
        readonly dividerSize: number;

        /**
         * Number of panels
         */
        readonly panelCount: number;

        /**
         * Previous size of the panel
         */
        readonly previousSize: number;

        /**
         * Ratio of the new size to the previous size
         */
        readonly ratio: number;

        /**
         * Remaining size of the container
         */
        readonly remainingSize: number;
    }): number;

    /**
     * Optional CSS class name which will be added to root <div> element
     */
    readonly className?: string_css_class;

    /**
     * If true, enables debug logging
     */
    readonly isTesting?: boolean;
};

/**
 * Renders a set of resizable panels
 * Each panel is separated by a divider which can be dragged to resize the panels
 * Children should be an array of ReactNode => which will be rendered as panels
 */
export function ResizablePanels(props: ResizablePanelsProps) {
    let { children } = props;
    const {
        direction,
        isReversed = false,
        name,
        getPanelInitialSize = ({ evenPanelSize }) => evenPanelSize,
        getPanelResize = ({ previousSize, ratio }) => previousSize * ratio,
        className,
        isTesting = false,
    } = props;

    // TODO: Direction must be same on same name
    just(name /* <- TODO: Implement */);
    TODO_USE(getPanelResize);

    if (isReversed) {
        // TODO: DO not do on phone layout
        children = children.slice().reverse();
    }

    const dividerSize = 10;

    const [fullContainerSize, setFullContainerSize] = useState<null | number>(null);
    const [panelSizes, setPanelSizes] = useState<null | Array<number>>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Debug logging
    if (isTesting) {
        console.log(
            `[ResizablePanels:${name}] Render - fullContainerSize:`,
            fullContainerSize,
            'panelSizes:',
            panelSizes,
            'isInitialized:',
            isInitialized,
        );
    }
    /*
    [👰]
    const [panelSizes, setPanelSizes] = useJsonStateInLocalstorage<null | Array<number>>(
        `ResizablePanels-${name}-panelSizes`,
        () => null,
    );
    */

    const [isResizing, setResizing] = useState<null | {
        panelIndex: number;
        resizeBeginThisPanelSize: number;
        resizeBeginNextPanelSize: number | null;
        resizeBeginPoinerPosition: number;
        dividerElement: HTMLElement;
        pointerId: number;
    }>(null);

    const initializePanelSizes = useCallback(
        (fullContainerSize: number) => {
            if (isTesting) {
                console.log(
                    `[ResizablePanels:${name}] initializePanelSizes called with fullContainerSize:`,
                    fullContainerSize,
                );
                console.log(`[ResizablePanels:${name}] Current panelSizes:`, panelSizes);
            }

            if (panelSizes !== null) {
                if (isTesting)
                    console.warn(`[ResizablePanels:${name}] Panel sizes are already set, skipping initialization`);
                return;
            }

            if (fullContainerSize <= 0) {
                if (isTesting) console.warn(`[ResizablePanels:${name}] Invalid fullContainerSize:`, fullContainerSize);
                return;
            }

            const evenPanelSize: number = (fullContainerSize - dividerSize * (children.length - 1)) / children.length;
            if (isTesting)
                console.log(
                    `[ResizablePanels:${name}] evenPanelSize:`,
                    evenPanelSize,
                    'children.length:',
                    children.length,
                );

            let remainingSize = fullContainerSize;

            let index = 0;
            const initialPanelSizes: Array<number> = [];

            for (const panel of children) {
                TODO_USE(panel);

                if (index !== children.length - 1) {
                    const remainingEvenSize =
                        (remainingSize - dividerSize * (children.length - 1 - index)) / (children.length - index);

                    const panelSize = getPanelInitialSize({
                        index,
                        fullContainerSize,
                        panelCount: children.length,
                        dividerSize,
                        evenPanelSize,
                        remainingSize,
                        remainingEvenSize,
                    });
                    remainingSize -= panelSize;
                    remainingSize -= dividerSize;
                    initialPanelSizes.push(panelSize);
                    if (isTesting) console.log(`[ResizablePanels:${name}] Panel ${index} size:`, panelSize);
                } else {
                    initialPanelSizes.push(remainingSize);
                    if (isTesting) console.log(`[ResizablePanels:${name}] Last panel ${index} size:`, remainingSize);
                }

                index++;
            }

            if (isTesting) console.log(`[ResizablePanels:${name}] Final initialPanelSizes:`, initialPanelSizes);
            setPanelSizes(initialPanelSizes);
            setIsInitialized(true);
        },
        [panelSizes, children, dividerSize, getPanelInitialSize, isTesting, name],
    );

    const resizePanelSizes = (fullContainerSize: number) => {
        if (panelSizes === null) {
            throw new Error('Panel sizes are not set');
        }

        const totalDividerSpace = dividerSize * (panelSizes.length - 1);
        const availableSpace = fullContainerSize - totalDividerSpace;
        const totalCurrentSize = panelSizes.reduce((sum, size) => sum + size, 0);
        const ratio = availableSpace / totalCurrentSize;

        const newPanelSizes: number[] = [];
        for (let i = 0; i < panelSizes.length; i++) {
            if (i !== panelSizes.length - 1) {
                newPanelSizes.push(panelSizes[i]! * ratio);
            } else {
                // Last panel gets remaining space
                const remainingSpace =
                    availableSpace - newPanelSizes.reduce((sum: number, size: number) => sum + size, 0);
                newPanelSizes.push(remainingSpace);
            }
        }

        setPanelSizes(newPanelSizes);
    };

    const resizablePanelsRef = useRef<HTMLDivElement>(null);

    // Separate effect for initialization that runs on every render until initialized
    useEffect(() => {
        if (isInitialized || !resizablePanelsRef.current) {
            return;
        }

        const element = resizablePanelsRef.current;
        const rect = element.getBoundingClientRect();
        const size = rect[direction === 'HORIZONTAL' ? 'width' : 'height'];

        if (isTesting) {
            console.log(
                `[ResizablePanels:${name}] Initialization check - size:`,
                size,
                'isInitialized:',
                isInitialized,
            );
        }

        if (size > 0) {
            if (isTesting) console.log(`[ResizablePanels:${name}] Initializing with size:`, size);
            setFullContainerSize(size);
            initializePanelSizes(size);
        }
    }, [isInitialized, name, isTesting, direction, initializePanelSizes]);

    useEffect(
        () => {
            if (isTesting) console.log(`[ResizablePanels:${name}] useEffect for ResizeObserver triggered`);
            const resizablePanelsElement = resizablePanelsRef.current;

            if (resizablePanelsElement === null) {
                if (isTesting) console.warn(`[ResizablePanels:${name}] resizablePanelsElement is null`);
                return;
            }

            const handleResize = (entries: ResizeObserverEntry[]) => {
                const fullContainerSize =
                    entries[0]!.contentRect[
                        {
                            HORIZONTAL: 'width' as const,
                            VERTICAL: 'height' as const,
                        }[direction]
                    ];
                if (isTesting)
                    console.log(
                        `[ResizablePanels:${name}] ResizeObserver fired - fullContainerSize:`,
                        fullContainerSize,
                    );
                setFullContainerSize(fullContainerSize);

                if (panelSizes === null && fullContainerSize > 0) {
                    if (isTesting)
                        console.log(`[ResizablePanels:${name}] Calling initializePanelSizes from ResizeObserver`);
                    initializePanelSizes(fullContainerSize);
                } else if (panelSizes !== null) {
                    if (isTesting)
                        console.log(`[ResizablePanels:${name}] Calling resizePanelSizes from ResizeObserver`);
                    resizePanelSizes(fullContainerSize);
                }
            };

            const resizeObserver = new ResizeObserver(handleResize);
            resizeObserver.observe(resizablePanelsElement);
            if (isTesting) console.log(`[ResizablePanels:${name}] ResizeObserver created and observing`);

            return () => {
                if (isTesting) console.log(`[ResizablePanels:${name}] Cleaning up ResizeObserver`);
                resizeObserver.unobserve(resizablePanelsElement);
                resizeObserver.disconnect();
            };
        },
        // Note: Removed `panelSizes` from deps from dependencies to avoid recreation
        [isTesting, name, direction, children.length],
    );

    // Global event listeners for pointer events (handles both mouse and touch)
    useEffect(() => {
        const handlePointerMove = (event: PointerEvent) => {
            if (isResizing === null || event.pointerId !== isResizing.pointerId) {
                return;
            }

            event.preventDefault();

            const currentPosition =
                event[
                    {
                        HORIZONTAL: 'clientX' as const,
                        VERTICAL: 'clientY' as const,
                    }[direction]
                ];

            setPanelSizes(
                ((panelSizes) => {
                    if (panelSizes === null) {
                        return null;
                    }

                    panelSizes = [...panelSizes];
                    panelSizes[isResizing.panelIndex] =
                        isResizing.resizeBeginThisPanelSize + (currentPosition - isResizing.resizeBeginPoinerPosition);

                    if (isResizing.resizeBeginNextPanelSize !== null) {
                        panelSizes[isResizing.panelIndex + 1] =
                            isResizing.resizeBeginNextPanelSize -
                            (currentPosition - isResizing.resizeBeginPoinerPosition);
                    }

                    return panelSizes;
                })(panelSizes),
            );
        };

        const handlePointerUp = (event: PointerEvent) => {
            if (isResizing === null || event.pointerId !== isResizing.pointerId) {
                return;
            }

            event.preventDefault();

            // Release pointer capture
            try {
                isResizing.dividerElement.releasePointerCapture(isResizing.pointerId);
            } catch (error) {
                // Ignore errors if pointer capture was already released
                if (isTesting) console.warn('Failed to release pointer capture:', error);
            }

            setResizing(null);
        };

        if (isResizing !== null) {
            document.addEventListener('pointermove', handlePointerMove);
            document.addEventListener('pointerup', handlePointerUp);
            document.addEventListener('pointercancel', handlePointerUp);
        }

        return () => {
            document.removeEventListener('pointermove', handlePointerMove);
            document.removeEventListener('pointerup', handlePointerUp);
            document.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [isTesting, isResizing, direction, panelSizes]);

    const panels = useMemo<Array<ReactNode>>(() => {
        if (panelSizes === null) {
            return [];
        }

        const panels: Array<ReactNode> = [];

        let index = 0;
        for (const panel of children) {
            const panelIndex = index;
            panels.push(
                <div
                    key={`panel-${panelIndex}`}
                    style={{
                        [{
                            HORIZONTAL: 'width' as const,
                            VERTICAL: 'height' as const,
                        }[direction]]: panelSizes[panelIndex] + 'px',
                    }}
                    className={classNames(
                        styles.panel,
                        (isResizing?.panelIndex === panelIndex || isResizing?.panelIndex === panelIndex - 1) &&
                            styles.isResizing,
                    )}
                >
                    {panel}
                </div>,
            );

            // Use a unique prefix for divider keys to avoid collision with panel keys
            panels.push(
                <div
                    key={`divider-${panelIndex}`}
                    style={{
                        [{
                            HORIZONTAL: 'width' as const,
                            VERTICAL: 'height' as const,
                        }[direction]]: dividerSize,
                        display: {
                            HORIZONTAL: 'inline-block',
                            VERTICAL: 'block',
                        }[direction],
                        cursor: {
                            HORIZONTAL: 'ew-resize',
                            VERTICAL: 'ns-resize',
                        }[direction],
                    }}
                    className={classNames(styles.divider, isResizing?.panelIndex === panelIndex && styles.isResizing)}
                    onPointerDown={(event) => {
                        if (isTesting)
                            console.log(
                                `[ResizablePanels:${name}] onPointerDown - panelIndex:`,
                                panelIndex,
                                'pointerId:',
                                event.pointerId,
                            );
                        if (isTesting) console.log(`[ResizablePanels:${name}] Current panelSizes:`, panelSizes);

                        event.preventDefault();
                        event.stopPropagation();

                        const startPosition =
                            event[
                                {
                                    HORIZONTAL: 'clientX' as const,
                                    VERTICAL: 'clientY' as const,
                                }[direction]
                            ];

                        if (isTesting) console.log(`[ResizablePanels:${name}] startPosition:`, startPosition);

                        const dividerElement = event.currentTarget as HTMLElement;

                        // Set pointer capture to ensure we receive all pointer events
                        try {
                            dividerElement.setPointerCapture(event.pointerId);
                            if (isTesting) console.log(`[ResizablePanels:${name}] setPointerCapture successful`);
                        } catch (error) {
                            if (isTesting) console.error(`[ResizablePanels:${name}] setPointerCapture failed:`, error);
                        }

                        const resizeBeginThisPanelSize = panelSizes![panelIndex];

                        if (resizeBeginThisPanelSize === undefined) {
                            throw new Error('resizeBeginThisPanelSize is undefined');
                        }

                        let resizeBeginNextPanelSize: number | null;
                        if (panelIndex + 1 >= panelSizes!.length) {
                            resizeBeginNextPanelSize = null;
                        } else {
                            resizeBeginNextPanelSize = panelSizes![panelIndex + 1]!;

                            if (resizeBeginNextPanelSize === undefined) {
                                throw new Error('resizeBeginNextPanelSize is undefined');
                            }
                        }

                        const resizeState = {
                            panelIndex,
                            resizeBeginThisPanelSize,
                            resizeBeginNextPanelSize,
                            resizeBeginPoinerPosition: startPosition,
                            dividerElement,
                            pointerId: event.pointerId,
                        };

                        if (isTesting) console.log(`[ResizablePanels:${name}] Setting resize state:`, resizeState);
                        setResizing(resizeState);
                    }}
                />,
            );
            index++;
        }
        panels.pop(); // <- Note: Remove last divider
        return panels;
    }, [isTesting, name, children, direction, panelSizes, isResizing]);

    return (
        <div
            ref={resizablePanelsRef}
            className={classNames(styles.ResizablePanels, styles[direction], className)}
            style={{
                userSelect: isResizing !== null ? 'none' : undefined,
            }}
        >
            {panels}
        </div>
    );
}

/**
 * TODO: [👰] Persist the size
 * TODO: [☎] !!! Mobile view for PromptbookStudio
 */
