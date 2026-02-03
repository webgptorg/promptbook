/**
 * Determines whether search params indicate a folder-scoped agents view.
 *
 * @param searchParams - Search params from a Next.js route.
 * @returns True when the folder query param is present and non-empty.
 */
export function getIsSubfolderView(
    searchParams: Record<string, string | string[] | undefined> | undefined,
): boolean {
    if (!searchParams) {
        return false;
    }

    const folderParam = searchParams.folder;
    if (Array.isArray(folderParam)) {
        return folderParam.some((value) => value.trim().length > 0);
    }

    if (typeof folderParam !== 'string') {
        return false;
    }

    return folderParam.trim().length > 0;
}
