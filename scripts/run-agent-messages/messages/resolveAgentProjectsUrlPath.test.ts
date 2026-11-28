import { join } from 'path';
import { resolveAgentProjectsUrlPath } from './resolveAgentProjectsUrlPath';

describe('resolveAgentProjectsUrlPath', () => {
    it('derives the projects URL path from conventional agent runner folders', () => {
        expect(resolveAgentProjectsUrlPath(join('/', 'srv', 'agents', 'agent-1dkmraaikkd8yp'))).toBe(
            '/agents/1dkmraaikkd8yp/projects',
        );
    });

    it('resolves nothing for ad-hoc workspaces outside the convention', () => {
        expect(resolveAgentProjectsUrlPath(join('/', 'tmp', 'session-xyz'))).toBe(undefined);
    });
});
