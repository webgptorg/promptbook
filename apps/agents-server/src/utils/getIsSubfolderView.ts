/**
 * Determines whether search params indicate a folder-scoped agents view.
 *
 * @param searchParams - Search params from a Next.js route.
 * @returns True when the folder query param is present and non-empty.
 */
export function getIsSubfolderView(
    searchParams:
        | Record<string, string | string[] | undefined>
        | Pick<URLSearchParams, 'get' | 'getAll'>
        | undefined,
): boolean {
    if (!searchParams) {
        return false;
    }

    if ('get' in searchParams && typeof searchParams.get === 'function') {
        const folderValues = typeof searchParams.getAll === 'function'
            ? searchParams.getAll('folder')
            : [searchParams.get('folder')].filter((value): value is string => value !== null);

        return folderValues.some((value) => value.trim().length > 0);
    }

    const folderParam = (searchParams as Record<string, string | string[] | undefined>).folder;
    if (Array.isArray(folderParam)) {
        return folderParam.some((value) => value.trim().length > 0);
    }

    if (typeof folderParam !== 'string') {
        return false;
    }

    return folderParam.trim().length > 0;
}
