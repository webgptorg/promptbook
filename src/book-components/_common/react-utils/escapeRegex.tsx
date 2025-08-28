/**
 * Escape text for safe use inside a RegExp pattern.
 *
 * @private within the promptbook components <- TODO: Maybe make promptbook util from this
 */
export function escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
