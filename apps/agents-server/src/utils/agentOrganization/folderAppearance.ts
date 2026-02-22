/**
 * Default folder icon identifier used when no custom icon is configured.
 */
export const DEFAULT_FOLDER_ICON = 'folder' as const;

/**
 * Default folder color used when no custom color is configured.
 */
export const DEFAULT_FOLDER_COLOR = '#f59e0b' as const;

/**
 * Allowed icon identifiers for folders.
 */
export const FOLDER_ICON_IDS = [
    'folder',
    'briefcase',
    'book',
    'bot',
    'brain',
    'code',
    'flask',
    'globe',
    'image',
    'message-square',
    'shield',
    'sparkles',
    'calendar',
    'chart-line',
    'crown',
    'heart',
    'palette',
    'rocket',
    'star',
    'sun',
] as const;

/**
 * Union type for supported folder icon identifiers.
 */
export type FolderIconId = (typeof FOLDER_ICON_IDS)[number];

/**
 * Fast lookup table for allowed folder icon identifiers.
 */
const FOLDER_ICON_SET = new Set<string>(FOLDER_ICON_IDS);
/**
 * Strict HEX color pattern used for folder color validation.
 */
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * Normalizes and validates a raw folder icon identifier.
 *
 * @param rawIcon - Raw icon identifier value.
 * @returns Normalized icon id, null for empty values, or undefined for invalid values.
 */
export function parseFolderIcon(rawIcon: unknown): FolderIconId | null | undefined {
    if (rawIcon === undefined) {
        return undefined;
    }
    if (rawIcon === null) {
        return null;
    }
    if (typeof rawIcon !== 'string') {
        return undefined;
    }

    const normalizedIcon = rawIcon.trim().toLowerCase();
    if (!normalizedIcon) {
        return null;
    }
    if (!FOLDER_ICON_SET.has(normalizedIcon)) {
        return undefined;
    }

    return normalizedIcon as FolderIconId;
}

/**
 * Resolves a safe folder icon id, falling back to the default icon.
 *
 * @param rawIcon - Raw icon identifier value.
 * @returns Safe icon id for UI rendering.
 */
export function resolveFolderIcon(rawIcon: string | null | undefined): FolderIconId {
    const parsedIcon = parseFolderIcon(rawIcon);
    return parsedIcon ?? DEFAULT_FOLDER_ICON;
}

/**
 * Normalizes and validates a raw folder color value.
 *
 * @param rawColor - Raw folder color value.
 * @returns Normalized color value, null for empty values, or undefined for invalid values.
 */
export function parseFolderColor(rawColor: unknown): string | null | undefined {
    if (rawColor === undefined) {
        return undefined;
    }
    if (rawColor === null) {
        return null;
    }
    if (typeof rawColor !== 'string') {
        return undefined;
    }

    const normalizedColor = rawColor.trim().toLowerCase();
    if (!normalizedColor) {
        return null;
    }
    if (!HEX_COLOR_PATTERN.test(normalizedColor)) {
        return undefined;
    }

    return normalizedColor;
}

/**
 * Resolves a safe folder color, falling back to the default color.
 *
 * @param rawColor - Raw folder color value.
 * @returns Safe color for UI rendering.
 */
export function resolveFolderColor(rawColor: string | null | undefined): string {
    const parsedColor = parseFolderColor(rawColor);
    return parsedColor ?? DEFAULT_FOLDER_COLOR;
}
