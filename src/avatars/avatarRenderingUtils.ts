/* eslint-disable no-magic-numbers */

import { PROMPTBOOK_COLOR } from '../config';
import type { AgentBasicInformation } from '../book-2.0/agent-source/AgentBasicInformation';
import type { string_color } from '../types/typeAliases';
import { Color } from '../utils/color/Color';
import { darken } from '../utils/color/operators/darken';
import { lighten } from '../utils/color/operators/lighten';
import { saturate } from '../utils/color/operators/saturate';
import type { AvatarDefinition } from './types/AvatarDefinition';
import type { AvatarPalette, AvatarSurfaceStyle } from './types/AvatarVisualDefinition';

// Note: [💞] Ignore a discrepancy between file name and entity name

/**
 * Default square size used by avatar renderers.
 *
 * @private utility of the avatar rendering system
 */
export const DEFAULT_AVATAR_SIZE = 192;

/**
 * Default fallback hash used when no explicit hash is provided.
 *
 * @private utility of the avatar rendering system
 */
const DEFAULT_AVATAR_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Default fallback name used when no explicit name is provided.
 *
 * @private utility of the avatar rendering system
 */
const DEFAULT_AVATAR_NAME = 'Anonymous Agent';

/**
 * Corner radius ratio used for the common rounded card frame.
 *
 * @private utility of the avatar rendering system
 */
const FRAME_RADIUS_RATIO = 0.18;

/**
 * Normalizes arbitrary agent colors into a stable non-empty color list.
 *
 * @param colors Raw color list.
 * @returns Stable list of usable colors.
 *
 * @private utility of the avatar rendering system
 */
export function normalizeAvatarColors(colors: ReadonlyArray<string_color>): ReadonlyArray<string_color> {
    const normalizedColors = colors
        .map((color) => String(color).trim())
        .filter((color) => color !== '')
        .map((color) => Color.fromSafe(color).toHex());

    if (normalizedColors.length > 0) {
        return normalizedColors;
    }

    return [PROMPTBOOK_COLOR.toHex()];
}

/**
 * Normalizes the avatar input so visuals can rely on consistent data.
 *
 * @param avatarDefinition Raw avatar input.
 * @returns Normalized avatar definition.
 *
 * @private utility of the avatar rendering system
 */
export function normalizeAvatarDefinition(avatarDefinition: AvatarDefinition): AvatarDefinition {
    return {
        agentName: (avatarDefinition.agentName || DEFAULT_AVATAR_NAME).trim() || DEFAULT_AVATAR_NAME,
        agentHash: (avatarDefinition.agentHash || DEFAULT_AVATAR_HASH).trim() || DEFAULT_AVATAR_HASH,
        colors: normalizeAvatarColors(avatarDefinition.colors),
    };
}

/**
 * Extracts avatar colors from the flexible `META COLOR` agent field.
 *
 * @param colorValue Raw `META COLOR` value.
 * @returns Parsed avatar colors.
 *
 * @private utility of the avatar rendering system
 */
export function parseAvatarColors(colorValue: string | undefined): ReadonlyArray<string_color> {
    if (!colorValue) {
        return [];
    }

    const colors: Array<string_color> = [];
    let currentColor = '';
    let bracketDepth = 0;

    for (const character of colorValue) {
        if (character === '(') {
            bracketDepth++;
            currentColor += character;
            continue;
        }

        if (character === ')') {
            bracketDepth = Math.max(0, bracketDepth - 1);
            currentColor += character;
            continue;
        }

        if (bracketDepth === 0 && [',', ';', '|', '\n'].includes(character)) {
            const normalizedColor = currentColor.trim();

            if (normalizedColor !== '') {
                colors.push(normalizedColor as string_color);
            }

            currentColor = '';
            continue;
        }

        currentColor += character;
    }

    const lastColor = currentColor.trim();

    if (lastColor !== '') {
        colors.push(lastColor as string_color);
    }

    return colors;
}

/**
 * Creates a reusable avatar definition from parsed agent information.
 *
 * @param agentBasicInformation Parsed agent information.
 * @returns Avatar definition ready for canvas rendering.
 *
 * @private shared helper for app-level avatar previews
 */
export function createAvatarDefinitionFromAgentBasicInformation(
    agentBasicInformation: Pick<AgentBasicInformation, 'agentName' | 'agentHash' | 'meta'>,
): AvatarDefinition {
    return normalizeAvatarDefinition({
        agentName: agentBasicInformation.agentName,
        agentHash: agentBasicInformation.agentHash,
        colors: parseAvatarColors(agentBasicInformation.meta.color),
    });
}

/**
 * Creates the shared derived palette used by every avatar visual.
 *
 * @param avatarDefinition Stable avatar definition.
 * @param surface Surface style used by the parent UI.
 * @returns Derived palette.
 *
 * @private utility of the avatar rendering system
 */
export function createAvatarPalette(
    avatarDefinition: AvatarDefinition,
    surface: AvatarSurfaceStyle = 'framed',
): AvatarPalette {
    const normalizedAvatarDefinition = normalizeAvatarDefinition(avatarDefinition);
    const primaryColor = Color.fromSafe(normalizedAvatarDefinition.colors[0] || PROMPTBOOK_COLOR);
    const secondaryColor = Color.fromSafe(
        normalizedAvatarDefinition.colors[1] || primaryColor.then(lighten(0.12)).then(saturate(0.16)),
    );
    const accentColor = Color.fromSafe(
        normalizedAvatarDefinition.colors[2] || primaryColor.then(saturate(0.32)).then(lighten(0.22)),
    );
    const backgroundColor = Color.fromSafe(primaryColor.then(darken(0.34)).then(saturate(-0.1)));
    const backgroundSecondaryColor = Color.fromSafe(
        secondaryColor.then(darken(0.42)).then(saturate(-0.16)).then(lighten(0.04)),
    );
    const highlightColor = Color.fromSafe(accentColor.then(lighten(0.22)).then(saturate(0.08)));
    const shadowColor = Color.fromSafe(primaryColor.then(darken(0.46)).then(saturate(0.14)));

    return {
        background: surface === 'transparent' ? ('transparent' as string_color) : backgroundColor.toHex(),
        backgroundSecondary:
            surface === 'transparent' ? ('transparent' as string_color) : backgroundSecondaryColor.toHex(),
        primary: primaryColor.toHex(),
        secondary: secondaryColor.toHex(),
        accent: accentColor.toHex(),
        highlight: highlightColor.toHex(),
        shadow: shadowColor.toHex(),
        ink: createInkColor(primaryColor),
    };
}

/**
 * Draws the common rounded background frame used by most visuals.
 *
 * @param context Canvas 2D context.
 * @param size Canvas size in CSS pixels.
 * @param palette Derived avatar palette.
 *
 * @private utility of the avatar rendering system
 */
export function drawAvatarFrame(context: CanvasRenderingContext2D, size: number, palette: AvatarPalette): void {
    if (palette.background === 'transparent' && palette.backgroundSecondary === 'transparent') {
        return;
    }

    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, palette.background);
    gradient.addColorStop(1, palette.backgroundSecondary);

    context.save();
    createRoundedRectPath(context, 0, 0, size, size, size * FRAME_RADIUS_RATIO);
    context.fillStyle = gradient;
    context.fill();
    context.restore();

    context.save();
    context.strokeStyle = 'rgba(255,255,255,0.12)';
    context.lineWidth = Math.max(1.5, size * 0.012);
    createRoundedRectPath(context, size * 0.02, size * 0.02, size * 0.96, size * 0.96, size * 0.15);
    context.stroke();
    context.restore();
}

/**
 * Creates a rounded rectangle path on the current canvas context.
 *
 * @param context Canvas 2D context.
 * @param x Left coordinate.
 * @param y Top coordinate.
 * @param width Rectangle width.
 * @param height Rectangle height.
 * @param radius Corner radius.
 *
 * @private utility of the avatar rendering system
 */
export function createRoundedRectPath(
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
): void {
    const normalizedRadius = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + normalizedRadius, y);
    context.arcTo(x + width, y, x + width, y + height, normalizedRadius);
    context.arcTo(x + width, y + height, x, y + height, normalizedRadius);
    context.arcTo(x, y + height, x, y, normalizedRadius);
    context.arcTo(x, y, x + width, y, normalizedRadius);
    context.closePath();
}

/**
 * Creates a stable pseudo-random number generator from a string seed.
 *
 * @param seedSource String seed.
 * @returns Generator producing values in `[0, 1)`.
 *
 * @private utility of the avatar rendering system
 */
export function createSeededRandom(seedSource: string): () => number {
    let state = hashStringToUint32(seedSource) || 0x9e3779b9;

    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let hash = Math.imul(state ^ (state >>> 15), 1 | state);
        hash ^= hash + Math.imul(hash ^ (hash >>> 7), 61 | hash);
        return ((hash ^ (hash >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Creates a deterministic random factory scoped to the avatar definition.
 *
 * @param avatarDefinition Stable avatar definition.
 * @returns Random factory that can be re-seeded per visual part.
 *
 * @private utility of the avatar rendering system
 */
export function createAvatarRandomFactory(avatarDefinition: AvatarDefinition): (salt: string) => () => number {
    const normalizedAvatarDefinition = normalizeAvatarDefinition(avatarDefinition);
    const seedBase = `${normalizedAvatarDefinition.agentName}|${normalizedAvatarDefinition.agentHash}|${normalizedAvatarDefinition.colors.join('|')}`;

    return (salt: string) => createSeededRandom(`${seedBase}|${salt}`);
}

/**
 * Clears and scales the canvas for crisp avatar rendering on high DPI displays.
 *
 * @param canvas Canvas element to prepare.
 * @param context Canvas 2D context.
 * @param size Canvas size in CSS pixels.
 * @param devicePixelRatio Device pixel ratio.
 *
 * @private utility of the avatar rendering system
 */
export function prepareAvatarCanvas(
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
    size: number,
    devicePixelRatio: number,
): void {
    const normalizedDevicePixelRatio = Math.max(1, Math.round(devicePixelRatio * 100) / 100);
    const nextCanvasWidth = Math.round(size * normalizedDevicePixelRatio);
    const nextCanvasHeight = Math.round(size * normalizedDevicePixelRatio);
    const nextCanvasStyleWidth = `${size}px`;
    const nextCanvasStyleHeight = `${size}px`;

    if (canvas.width !== nextCanvasWidth) {
        canvas.width = nextCanvasWidth;
    }

    if (canvas.height !== nextCanvasHeight) {
        canvas.height = nextCanvasHeight;
    }

    if (canvas.style.width !== nextCanvasStyleWidth) {
        canvas.style.width = nextCanvasStyleWidth;
    }

    if (canvas.style.height !== nextCanvasStyleHeight) {
        canvas.style.height = nextCanvasStyleHeight;
    }

    context.setTransform(normalizedDevicePixelRatio, 0, 0, normalizedDevicePixelRatio, 0, 0);
    context.clearRect(0, 0, size, size);
}

/**
 * Picks one deterministic element from a non-empty collection.
 *
 * @param items Candidate items.
 * @param random Seeded random generator.
 * @returns Picked item.
 *
 * @private utility of the avatar rendering system
 */
export function pickRandomItem<T>(items: ReadonlyArray<T>, random: () => number): T {
    return items[Math.floor(random() * items.length)]!;
}

/**
 * Creates a readable ink color from the given base color.
 *
 * @param color Base color.
 * @returns High-contrast ink color.
 *
 * @private utility of the avatar rendering system
 */
function createInkColor(color: Color): string_color {
    const perceivedBrightness = color.red * 0.299 + color.green * 0.587 + color.blue * 0.114;

    if (perceivedBrightness > 150) {
        return '#172033';
    }

    return '#f8fbff';
}

/**
 * Hashes an arbitrary string into a 32-bit unsigned integer.
 *
 * @param value Arbitrary input.
 * @returns 32-bit unsigned integer hash.
 *
 * @private utility of the avatar rendering system
 */
function hashStringToUint32(value: string): number {
    let hash = 2166136261;

    for (const character of value) {
        hash ^= character.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}
