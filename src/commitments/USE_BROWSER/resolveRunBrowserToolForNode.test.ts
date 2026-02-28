import { describe, expect, it, jest } from '@jest/globals';
import { resolveRunBrowserToolForNode } from './resolveRunBrowserToolForNode';

jest.mock('../../../apps/agents-server/src/tools/run_browser', () => ({
    run_browser: jest.fn(async () => 'ok from mock'),
}));

describe('resolveRunBrowserToolForNode', () => {
    it('returns the Agents Server run_browser implementation when available', async () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const runBrowserModule = require('../../../apps/agents-server/src/tools/run_browser') as {
            run_browser: jest.MockedFunction<(args: { url: string }) => Promise<string>>;
        };

        const toolFunction = resolveRunBrowserToolForNode();
        const result = await toolFunction({ url: 'https://example.com' });

        expect(result).toBe('ok from mock');
        expect(runBrowserModule.run_browser).toHaveBeenCalledWith({ url: 'https://example.com' });
    });
});
