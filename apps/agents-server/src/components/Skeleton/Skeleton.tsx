import type { CSSProperties } from 'react';

/**
 * Props accepted by the generic skeleton block.
 */
type SkeletonProps = {
    /**
     * Optional class names composed with the default skeleton styling.
     */
    readonly className?: string;
    /**
     * Optional explicit width.
     */
    readonly width?: CSSProperties['width'];
    /**
     * Optional explicit height.
     */
    readonly height?: CSSProperties['height'];
};

/**
 * Reusable shimmer block used by all loading skeleton layouts.
 */
export function Skeleton({ className = '', width, height }: SkeletonProps) {
    const style: CSSProperties = {
        ...(width !== undefined ? { width } : {}),
        ...(height !== undefined ? { height } : {}),
    };

    return <div aria-hidden="true" className={`skeleton-block ${className}`.trim()} style={style} />;
}
