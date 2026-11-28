import { RESERVED_PATHS } from '../../generated/reservedPaths';

/**
 * Reserved top-level routes that cannot be interpreted as agent aliases.
 */
const RESERVED_HEADER_PATH_SET = new Set<string>(RESERVED_PATHS);

/**
 * Resolves the next pathname after renaming the active agent from the header menus.
 *
 * @private function of Header
 */
export function resolveRenamedHeaderPath(pathname: string, nextAgentName: string): string | null {
    const pathSegments = pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) {
        return null;
    }

    if (pathSegments[0] === 'agents' && pathSegments[1]) {
        pathSegments[1] = encodeURIComponent(nextAgentName);
        return `/${pathSegments.join('/')}`;
    }

    if (RESERVED_HEADER_PATH_SET.has(pathSegments[0])) {
        return null;
    }

    pathSegments[0] = encodeURIComponent(nextAgentName);
    return `/${pathSegments.join('/')}`;
}
