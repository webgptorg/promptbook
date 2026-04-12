import { resolveRenamedHeaderPath } from './resolveRenamedHeaderPath';

/**
 * Minimal router surface needed by the header rename follow-up helper.
 *
 * @private type of Header
 */
type HeaderRenameRouter = {
    readonly refresh: () => void;
    readonly replace: (href: string) => void;
};

/**
 * Inputs required to update the current route after renaming an agent from the header.
 *
 * @private type of Header
 */
type NavigateAfterHeaderAgentRenameOptions = {
    readonly activeAgentNavigationId: string | null;
    readonly activeAgentPermanentId?: string | null;
    readonly nextAgentName: string | undefined;
    readonly pathname: string | null;
    readonly router: HeaderRenameRouter;
    readonly search: string;
};

/**
 * Resolves whether the current route is anchored to the immutable permanent id.
 *
 * @private function of Header
 */
function isUsingPermanentAgentIdentifier(
    activeAgentNavigationId: string | null,
    activeAgentPermanentId?: string | null,
): boolean {
    return Boolean(activeAgentPermanentId) && activeAgentNavigationId === activeAgentPermanentId;
}

/**
 * Resolves the replacement href after a successful rename when route replacement is possible.
 *
 * @private function of Header
 */
function resolveRenamedHeaderHref(
    pathname: string | null,
    nextAgentName: string | undefined,
    search: string,
): string | null {
    if (!pathname || !nextAgentName) {
        return null;
    }

    const nextPath = resolveRenamedHeaderPath(pathname, nextAgentName);
    if (!nextPath) {
        return null;
    }

    return `${nextPath}${search}`;
}

/**
 * Updates the current route after renaming the active agent from the header menu.
 *
 * @private function of Header
 */
export function navigateAfterHeaderAgentRename({
    activeAgentNavigationId,
    activeAgentPermanentId,
    nextAgentName,
    pathname,
    router,
    search,
}: NavigateAfterHeaderAgentRenameOptions): void {
    if (!nextAgentName) {
        return;
    }

    if (isUsingPermanentAgentIdentifier(activeAgentNavigationId, activeAgentPermanentId)) {
        router.refresh();
        return;
    }

    const nextHref = resolveRenamedHeaderHref(pathname, nextAgentName, search);
    if (!nextHref) {
        router.refresh();
        return;
    }

    router.replace(nextHref);
}
