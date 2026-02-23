/**
 * @@@
 *
 * @public exported from `@promptbook/utils`
 */
export function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
