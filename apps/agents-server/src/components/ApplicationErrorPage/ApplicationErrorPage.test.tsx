/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApplicationErrorPage } from './ApplicationErrorPage';
import type { ApplicationBoundaryError } from '../../utils/errorReporting/applicationErrorHandling';
import * as refreshApplicationDocumentModule from '../../utils/errorReporting/refreshApplicationDocument';

/**
 * Creates a deterministic boundary error used across branded 500-page tests.
 *
 * @returns Stable application boundary error instance.
 */
function createTestError(): ApplicationBoundaryError {
    return Object.assign(new Error('Boom went the server.'), {
        digest: '1234567890',
    });
}

/**
 * Creates a stale-build chunk-load error matching the production failure mode.
 *
 * @returns Stable chunk-load boundary error instance.
 */
function createChunkLoadError(): ApplicationBoundaryError {
    return Object.assign(
        new Error('Loading chunk 311 failed.\n(timeout: https://example.test/_next/static/chunks/311-demo.js)'),
        {
            name: 'ChunkLoadError',
            digest: '0987654321',
        },
    );
}

describe('ApplicationErrorPage', () => {
    const originalVariant = process.env.NEXT_PUBLIC_APPLICATION_ERROR_VARIANT;
    let fetchSpy: jest.SpiedFunction<typeof fetch>;
    let refreshSpy: jest.SpiedFunction<typeof refreshApplicationDocumentModule.refreshApplicationDocument>;

    beforeEach(() => {
        fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            text: async () => '',
        } as Response);
        refreshSpy = jest
            .spyOn(refreshApplicationDocumentModule, 'refreshApplicationDocument')
            .mockImplementation(() => undefined);
        window.sessionStorage.clear();
    });

    afterEach(() => {
        process.env.NEXT_PUBLIC_APPLICATION_ERROR_VARIANT = originalVariant;
        jest.useRealTimers();
        fetchSpy.mockRestore();
        refreshSpy.mockRestore();
        window.sessionStorage.clear();
    });

    it('renders the default advanced variant inside the shared branded error shell', async () => {
        delete process.env.NEXT_PUBLIC_APPLICATION_ERROR_VARIANT;

        render(<ApplicationErrorPage error={createTestError()} reset={jest.fn()} />);

        expect(screen.getByRole('heading', { name: '500 / Internal Server Error' })).not.toBeNull();
        expect(screen.getByText('A server exception occurred while loading Promptbook Agents Server.')).not.toBeNull();
        expect(
            screen.getByText('Boom went the server. - the server for Promptbook Agents Server logged this failure.'),
        ).not.toBeNull();
        expect(screen.getByText('Refresh the route')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Try again' })).not.toBeNull();
        expect(screen.getByRole('link', { name: 'Go to homepage' }).getAttribute('href')).toBe('/');

        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    });

    it('lets the user retry from the simple variant without troubleshooting cards', () => {
        process.env.NEXT_PUBLIC_APPLICATION_ERROR_VARIANT = 'simple';
        const reset = jest.fn();

        render(<ApplicationErrorPage error={createTestError()} reset={reset} />);

        fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

        expect(reset).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('Refresh the route')).toBeNull();
    });

    it('auto-refreshes recoverable chunk-load failures once and switches the primary action to a hard refresh', async () => {
        jest.useFakeTimers();
        const reset = jest.fn();

        render(<ApplicationErrorPage error={createChunkLoadError()} reset={reset} />);

        expect(screen.getByRole('button', { name: 'Refresh now' })).not.toBeNull();
        expect(
            screen.getByText(
                'The browser could not load the latest application files for Promptbook Agents Server. Refreshing the page usually resolves this after a deployment or stale cached shell.',
            ),
        ).not.toBeNull();
        expect(
            screen.getByText('Refreshing this page automatically once so the latest application files can be loaded.'),
        ).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Refresh now' }));

        expect(refreshSpy).toHaveBeenCalledTimes(1);
        expect(reset).toHaveBeenCalledTimes(0);

        act(() => {
            jest.advanceTimersByTime(1500);
        });

        expect(refreshSpy).toHaveBeenCalledTimes(2);

        await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    });

    it('does not auto-refresh a second time after the recoverable error already triggered one hard refresh', () => {
        jest.useFakeTimers();
        const chunkLoadError = createChunkLoadError();
        window.sessionStorage.setItem(
            `promptbook.application-error-hard-refresh:${window.location.href}:${chunkLoadError.digest}`,
            'done',
        );

        render(<ApplicationErrorPage error={chunkLoadError} reset={jest.fn()} />);

        expect(
            screen.getByText(
                'Automatic refresh already ran once. If the newest assets still do not load, use "Refresh now" or share the digest with your administrator.',
            ),
        ).not.toBeNull();

        act(() => {
            jest.advanceTimersByTime(2000);
        });

        expect(refreshSpy).not.toHaveBeenCalled();
    });
});
