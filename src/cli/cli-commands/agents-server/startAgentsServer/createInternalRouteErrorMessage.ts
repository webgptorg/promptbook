/**
 * Builds a foreground failure message for one internal Agents Server route.
 *
 * @private internal utility of `startAgentsServer`
 */
export function createInternalRouteErrorMessage(routeLabel: string, response: Response, details: string | null): string {
    const statusText = response.statusText ? ` ${response.statusText}` : '';
    const statusMessage = `${response.status}${statusText}`;

    if (!details) {
        return `Internal ${routeLabel} route returned ${statusMessage}.`;
    }

    return `Internal ${routeLabel} route returned ${statusMessage}: ${details}`;
}
