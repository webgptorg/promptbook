import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
    resolveAgentBrowserProfileStorageDirectory,
    resolveDefaultAgentBrowserProfileDirectory,
} from './resolveAgentBrowserProfileDirectory';

describe('resolveDefaultAgentBrowserProfileDirectory', () => {
    let originalStorageDirectoryEnv: string | undefined;

    beforeEach(() => {
        originalStorageDirectoryEnv = process.env.AGENT_BROWSER_PROFILE_STORAGE_DIRECTORY;
    });

    afterEach(() => {
        if (originalStorageDirectoryEnv === undefined) {
            delete process.env.AGENT_BROWSER_PROFILE_STORAGE_DIRECTORY;
        } else {
            process.env.AGENT_BROWSER_PROFILE_STORAGE_DIRECTORY = originalStorageDirectoryEnv;
        }
    });

    it('resolves a deterministic per-agent directory inside the profile storage root', () => {
        delete process.env.AGENT_BROWSER_PROFILE_STORAGE_DIRECTORY;

        const directory = resolveDefaultAgentBrowserProfileDirectory('agent-permanent-id-123');

        expect(directory).toBe(`${resolveAgentBrowserProfileStorageDirectory()}/agent-agent-permanent-id-123`);
        expect(directory).toContain('.promptbook');
        expect(directory).toBe(resolveDefaultAgentBrowserProfileDirectory('agent-permanent-id-123'));
    });

    it('sanitizes filesystem-unsafe characters in the agent permanent id', () => {
        delete process.env.AGENT_BROWSER_PROFILE_STORAGE_DIRECTORY;

        const directory = resolveDefaultAgentBrowserProfileDirectory('agent/../..\\evil id');

        expect(directory.endsWith('/agent-agent-------evil-id')).toBe(true);
        expect(directory).not.toContain('..');
    });

    it('honors the AGENT_BROWSER_PROFILE_STORAGE_DIRECTORY override', () => {
        process.env.AGENT_BROWSER_PROFILE_STORAGE_DIRECTORY = '/persistent/agent-profiles';

        const directory = resolveDefaultAgentBrowserProfileDirectory('abc');

        expect(directory).toBe('/persistent/agent-profiles/agent-abc');
    });

    it('rejects an empty agent permanent id', () => {
        expect(() => resolveDefaultAgentBrowserProfileDirectory('   ')).toThrow(/agentPermanentId/);
    });
});
