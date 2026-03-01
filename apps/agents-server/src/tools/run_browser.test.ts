import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { $execCommand } from '../../../../src/utils/execCommand/$execCommand';
import { run_browser } from './run_browser';

jest.mock('../../../../src/utils/execCommand/$execCommand', () => ({
    $execCommand: jest.fn(),
}));

const execCommandMock = $execCommand as jest.MockedFunction<typeof $execCommand>;

describe('run_browser tool', () => {
    beforeEach(() => {
        execCommandMock.mockReset();
    });

    it('returns a clear error when url is missing', async () => {
        const result = await run_browser({ url: '' });

        expect(result).toContain('# Browser run failed');
        expect(result).toContain('Missing required URL');
        expect(execCommandMock).not.toHaveBeenCalled();
    });

    it('opens a headed browser session', async () => {
        execCommandMock.mockResolvedValueOnce('Opened browser in headed mode');
        execCommandMock.mockResolvedValueOnce(
            ['- Page URL: https://example.com/', '- Page Title: Example Domain', '[Snapshot](.playwright-cli/snap.yml)'].join(
                '\n',
            ),
        );
        execCommandMock.mockResolvedValueOnce('Closed browser session');

        const result = await run_browser({ url: 'https://example.com' });

        expect(result).toContain('# Browser run completed');
        expect(result).toContain('**Mode:** headed');
        expect(result).toContain('.playwright-cli/snap.yml');

        const openCall = execCommandMock.mock.calls[0]?.[0];
        expect(openCall).toEqual(expect.objectContaining({ command: 'npx' }));
        expect((openCall as { args?: ReadonlyArray<string> }).args).toEqual(
            expect.arrayContaining(['--no-install', '@playwright/cli', 'open', 'https://example.com', '--headed']),
        );

        const closeCall = execCommandMock.mock.calls[2]?.[0];
        expect((closeCall as { args?: ReadonlyArray<string> }).args).toEqual(
            expect.arrayContaining(['close']),
        );
    });

    it('runs actions via run-code before final snapshot', async () => {
        execCommandMock.mockResolvedValueOnce('- Page URL: https://example.com/\n- Page Title: Example');
        execCommandMock.mockResolvedValueOnce('Action done');
        execCommandMock.mockResolvedValueOnce(
            ['- Page URL: https://example.com/after', '- Page Title: Example After', '[Snapshot](.playwright-cli/final.yml)'].join(
                '\n',
            ),
        );
        execCommandMock.mockResolvedValueOnce('Closed browser session');

        const result = await run_browser({
            url: 'https://example.com',
            actions: [{ type: 'wait', value: 250 }],
        });

        expect(result).toContain('**Executed actions:** 1');
        expect(result).toContain('.playwright-cli/final.yml');

        const actionCall = execCommandMock.mock.calls[1]?.[0];
        expect((actionCall as { args?: ReadonlyArray<string> }).args).toEqual(
            expect.arrayContaining(['run-code']),
        );
    });

    it('fails early when action arguments are invalid', async () => {
        const result = await run_browser({
            url: 'https://example.com',
            actions: [{ type: 'click' }],
        });

        expect(result).toContain('# Browser run failed');
        expect(result).toContain('"click" requires non-empty "selector"');
        expect(execCommandMock).not.toHaveBeenCalled();
    });
});
