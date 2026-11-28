/** Joins truthy class names into a single string. Tiny local helper, no dependency. */
export function cn(...classes: ReadonlyArray<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(' ');
}
