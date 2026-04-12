/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApplicationErrorPage } from './ApplicationErrorPage';
import type { ApplicationBoundaryError } from '../../utils/errorReporting/applicationErrorHandling';

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

describe('ApplicationErrorPage', () => {
    const originalVariant = process.env.NEXT_PUBLIC_APPLICATION_ERROR_VARIANT;
    let fetchSpy: jest.SpiedFunction<typeof fetch>;

    beforeEach(() => {
        fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
            ok: true,
            text: async () => '',
        } as Response);
    });

    afterEach(() => {
        process.env.NEXT_PUBLIC_APPLICATION_ERROR_VARIANT = originalVariant;
        fetchSpy.mockRestore();
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
});
