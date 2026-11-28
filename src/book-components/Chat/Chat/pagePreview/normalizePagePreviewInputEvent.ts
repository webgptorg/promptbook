import type { PagePreviewInputEvent, PagePreviewPointerButton } from './PagePreviewInputEvent';
import { clampPagePreviewViewport } from './PagePreviewViewport';

/**
 * Maximum absolute wheel delta accepted from one preview input event.
 *
 * @private constant of `normalizePagePreviewInputEvent`
 */
const PAGE_PREVIEW_MAX_WHEEL_DELTA = 1600;

/**
 * Maximum `KeyboardEvent.key` length accepted from one preview input event.
 *
 * @private constant of `normalizePagePreviewInputEvent`
 */
const PAGE_PREVIEW_MAX_KEY_LENGTH = 32;

/**
 * Maximum click count accepted from one preview pointer event.
 *
 * @private constant of `normalizePagePreviewInputEvent`
 */
const PAGE_PREVIEW_MAX_CLICK_COUNT = 3;

/**
 * Maximum URL length accepted from one preview `goto` event.
 *
 * @private constant of `normalizePagePreviewInputEvent`
 */
const PAGE_PREVIEW_MAX_GOTO_URL_LENGTH = 2048;

/**
 * Validates and normalizes one untrusted page-preview input payload into a typed input event.
 *
 * Note: This performs only structural validation shared by client and server — the Agents Server
 * additionally re-checks `goto` URLs against private/internal targets before navigating.
 *
 * @param payload - Unknown JSON payload (usually the parsed request body).
 * @returns Normalized input event or `null` when the payload is invalid.
 *
 * @private utility shared between `<LiveBrowserPreview/>` and the Agents Server page-preview routes
 */
export function normalizePagePreviewInputEvent(payload: unknown): PagePreviewInputEvent | null {
    if (typeof payload !== 'object' || payload === null) {
        return null;
    }

    const candidate = payload as Record<string, unknown>;

    switch (candidate.type) {
        case 'move':
        case 'click': {
            const pointer = normalizePointerRatios(candidate);
            if (!pointer) {
                return null;
            }

            return { type: candidate.type, ...pointer };
        }

        case 'down':
        case 'up': {
            const pointer = normalizePointerRatios(candidate);
            const button = normalizePointerButton(candidate.button);
            const clickCount = normalizeClickCount(candidate.clickCount);
            if (!pointer || !button) {
                return null;
            }

            return { type: candidate.type, ...pointer, button, clickCount };
        }

        case 'wheel': {
            const pointer = normalizePointerRatios(candidate);
            const deltaX = normalizeWheelDelta(candidate.deltaX);
            const deltaY = normalizeWheelDelta(candidate.deltaY);
            if (!pointer || deltaX === null || deltaY === null) {
                return null;
            }

            return { type: 'wheel', ...pointer, deltaX, deltaY };
        }

        case 'keydown':
        case 'keyup': {
            const key = normalizeKey(candidate.key);
            if (!key) {
                return null;
            }

            return { type: candidate.type, key };
        }

        case 'resize': {
            const viewport = clampPagePreviewViewport(candidate.width, candidate.height);
            if (!viewport) {
                return null;
            }

            return { type: 'resize', ...viewport };
        }

        case 'navigate': {
            if (candidate.action !== 'back' && candidate.action !== 'forward' && candidate.action !== 'reload') {
                return null;
            }

            return { type: 'navigate', action: candidate.action };
        }

        case 'goto': {
            const url = normalizeGotoUrl(candidate.url);
            if (!url) {
                return null;
            }

            return { type: 'goto', url };
        }

        default:
            return null;
    }
}

/**
 * Normalizes the pointer coordinate ratios of one payload.
 *
 * @param candidate - Raw payload fields.
 * @returns Ratios clamped to the viewport bounds, or `null` when invalid.
 */
function normalizePointerRatios(
    candidate: Record<string, unknown>,
): { readonly xRatio: number; readonly yRatio: number } | null {
    const xRatio = normalizeRatio(candidate.xRatio);
    const yRatio = normalizeRatio(candidate.yRatio);

    if (xRatio === null || yRatio === null) {
        return null;
    }

    return { xRatio, yRatio };
}

/**
 * Normalizes one pointer coordinate ratio.
 *
 * @param value - Unknown payload value.
 * @returns Ratio clamped to `0..1`, or `null` when invalid.
 */
function normalizeRatio(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }

    return Math.max(0, Math.min(1, value));
}

/**
 * Normalizes one mouse-wheel delta.
 *
 * @param value - Unknown payload value.
 * @returns Clamped wheel delta, or `null` when invalid.
 */
function normalizeWheelDelta(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return null;
    }

    return Math.max(-PAGE_PREVIEW_MAX_WHEEL_DELTA, Math.min(PAGE_PREVIEW_MAX_WHEEL_DELTA, value));
}

/**
 * Normalizes one pointer button name.
 *
 * @param value - Unknown payload value.
 * @returns Pointer button, or `null` when invalid.
 */
function normalizePointerButton(value: unknown): PagePreviewPointerButton | null {
    if (value === undefined) {
        return 'left';
    }

    return value === 'left' || value === 'middle' || value === 'right' ? value : null;
}

/**
 * Normalizes one pointer click count.
 *
 * @param value - Unknown payload value.
 * @returns Click count clamped to `1..3`.
 */
function normalizeClickCount(value: unknown): number {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
        return 1;
    }

    return Math.max(1, Math.min(PAGE_PREVIEW_MAX_CLICK_COUNT, value));
}

/**
 * Normalizes one `KeyboardEvent.key` value.
 *
 * @param value - Unknown payload value.
 * @returns Key name, or `null` when invalid.
 */
function normalizeKey(value: unknown): string | null {
    if (typeof value !== 'string' || value.length === 0 || value.length > PAGE_PREVIEW_MAX_KEY_LENGTH) {
        return null;
    }
    // Note: The spacebar key value is a single space, so only real control characters are rejected
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001f\u007f]/.test(value)) {
        return null;
    }

    return value;
}

/**
 * Normalizes one `goto` navigation URL.
 *
 * @param value - Unknown payload value.
 * @returns Absolute HTTP(S) URL, or `null` when invalid.
 */
function normalizeGotoUrl(value: unknown): string | null {
    if (typeof value !== 'string' || value.length === 0 || value.length > PAGE_PREVIEW_MAX_GOTO_URL_LENGTH) {
        return null;
    }

    let parsedUrl: URL;
    try {
        parsedUrl = new URL(value);
    } catch {
        return null;
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return null;
    }

    return parsedUrl.href;
}
