/**
 * Parses a numeric agent project id from a route parameter.
 *
 * @param projectId - Raw route parameter value.
 * @returns Positive integer project id or `null`.
 */
export function parseAgentProjectIdRouteParameter(projectId: string): number | null {
    const parsedProjectId = Number(projectId);
    return Number.isInteger(parsedProjectId) && parsedProjectId > 0 ? parsedProjectId : null;
}
