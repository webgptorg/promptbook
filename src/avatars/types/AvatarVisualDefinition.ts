import type { CSSProperties } from 'react';
import type { string_color, string_css_class } from '../../types/typeAliases';
import type { AvatarDefinition } from './AvatarDefinition';

/**
 * Supported built-in avatar visual identifiers.
 *
 * @private shared contract for the avatar rendering system
 */
export type AvatarVisualId =
    | 'pixel-art'
    | 'octopus'
    | 'octopus2'
    | 'octopus3'
    | 'ascii-octopus'
    | 'minecraft'
    | 'minecraft2'
    | 'fractal'
    | 'orb';

/**
 * Derived color palette used by avatar visuals.
 *
 * @private shared contract for the avatar rendering system
 */
export type AvatarPalette = {
    readonly background: string_color;
    readonly backgroundSecondary: string_color;
    readonly primary: string_color;
    readonly secondary: string_color;
    readonly accent: string_color;
    readonly highlight: string_color;
    readonly shadow: string_color;
    readonly ink: string_color;
};

/**
 * Surface style used when placing the avatar into different UI shells.
 *
 * @private shared contract for the avatar rendering system
 */
export type AvatarSurfaceStyle = 'framed' | 'transparent';

/**
 * Pointer source currently driving avatar interaction.
 *
 * @private shared contract for the avatar rendering system
 */
export type AvatarPointerType = 'idle' | 'mouse' | 'touch' | 'pen';

/**
 * Smoothed interaction state forwarded to animated avatar visuals.
 *
 * @private shared contract for the avatar rendering system
 */
export type AvatarInteractionState = {
    readonly gazeX: number;
    readonly gazeY: number;
    readonly bodyOffsetX: number;
    readonly bodyOffsetY: number;
    readonly intensity: number;
    readonly isPointerActive: boolean;
    readonly pointerType: AvatarPointerType;
};

/**
 * Rendering context forwarded to a single avatar visual.
 *
 * @private shared contract for the avatar rendering system
 */
export type AvatarVisualRenderContext = {
    readonly canvas: HTMLCanvasElement;
    readonly context: CanvasRenderingContext2D;
    readonly size: number;
    readonly devicePixelRatio: number;
    readonly timeMs: number;
    readonly avatarDefinition: AvatarDefinition;
    readonly palette: AvatarPalette;
    readonly createRandom: (salt: string) => () => number;
    readonly surface: AvatarSurfaceStyle;
    readonly interaction: AvatarInteractionState;
};

/**
 * Signature of one canvas-based avatar visual renderer.
 *
 * @private shared contract for the avatar rendering system
 */
export type AvatarVisual = (context: AvatarVisualRenderContext) => void;

/**
 * Metadata and renderer for one built-in avatar visual.
 *
 * @private shared contract for the avatar rendering system
 */
export type AvatarVisualDefinition = {
    readonly id: AvatarVisualId;
    readonly title: string;
    readonly description: string;
    readonly isAnimated: boolean;
    readonly supportsPointerTracking?: boolean;
    readonly render: AvatarVisual;
};

/**
 * Props of the shared `<Avatar/>` component.
 *
 * @private shared contract for the avatar rendering system
 */
export type AvatarProps = {
    /**
     * Stable visual identity for the rendered avatar.
     */
    readonly avatarDefinition: AvatarDefinition;

    /**
     * Selected visual style.
     */
    readonly visualId: AvatarVisualId;

    /**
     * Surface used to composite the avatar in its parent UI.
     */
    readonly surface?: AvatarSurfaceStyle;

    /**
     * Output size in CSS pixels.
     */
    readonly size?: number;

    /**
     * Optional canvas title.
     */
    readonly title?: string;

    /**
     * Optional CSS class name applied to the canvas.
     */
    readonly className?: string_css_class;

    /**
     * Optional inline style applied to the canvas.
     */
    readonly style?: CSSProperties;
};

/**
 * Low-level rendering options for a single canvas frame.
 *
 * @private shared contract for the avatar rendering system
 */
export type RenderAvatarVisualOptions = {
    readonly canvas: HTMLCanvasElement;
    readonly avatarDefinition: AvatarDefinition;
    readonly visualId: AvatarVisualId;
    readonly surface?: AvatarSurfaceStyle;
    readonly size: number;
    readonly timeMs: number;
    readonly devicePixelRatio?: number;
    readonly interaction?: AvatarInteractionState;
};
