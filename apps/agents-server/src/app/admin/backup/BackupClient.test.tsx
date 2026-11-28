/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BackupClient } from './BackupClient';
import { DEFAULT_SERVER_BACKUP_SECTION_KEYS } from '../../../utils/backup/serverBackupSections';

/**
 * Small deferred helper used to keep the backup request pending during loading-state assertions.
 */
function createDeferredPromise<T>() {
    let resolvePromise!: (value: T | PromiseLike<T>) => void;
    let rejectPromise!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
    });

    return {
        promise,
        resolve: resolvePromise,
        reject: rejectPromise,
    };
}

describe('BackupClient', () => {
    beforeEach(() => {
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            writable: true,
            value: jest.fn(() => 'blob:backup'),
        });
        Object.defineProperty(URL, 'revokeObjectURL', {
            configurable: true,
            writable: true,
            value: jest.fn(),
        });

        jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('starts with every backup section selected and sends only the chosen sections to the export route', async () => {
        const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
            new Response(new Blob(['backup-bytes']), {
                status: 200,
                headers: {
                    'Content-Disposition': 'attachment; filename="backup.zip"',
                },
            }),
        );

        render(<BackupClient />);

        const metadataCheckbox = screen.getByRole('checkbox', { name: /^Metadata and limits/ }) as HTMLInputElement;
        const messagesCheckbox = screen.getByRole('checkbox', { name: /^Zpravy/ }) as HTMLInputElement;
        expect(metadataCheckbox.checked).toBe(true);
        expect(messagesCheckbox.checked).toBe(true);
        expect(screen.getByText('Always excluded')).toBeTruthy();
        expect(screen.getByText('Caches and runtime state')).toBeTruthy();

        fireEvent.click(messagesCheckbox);
        expect(messagesCheckbox.checked).toBe(false);

        fireEvent.click(screen.getByRole('button', { name: 'Download selected backup' }));

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        const requestUrl = new URL(String(fetchMock.mock.calls[0]![0]));
        expect(requestUrl.pathname).toBe('/api/admin/backups/server');
        expect(requestUrl.searchParams.getAll('section')).toEqual(
            DEFAULT_SERVER_BACKUP_SECTION_KEYS.filter((sectionKey) => sectionKey !== 'messages'),
        );
    });

    it('disables the controls and shows progress while the ZIP is being generated', async () => {
        const deferredResponse = createDeferredPromise<Response>();
        const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => deferredResponse.promise as never);

        render(<BackupClient />);

        fireEvent.click(screen.getByRole('button', { name: 'Download full backup' }));

        const loadingButton = screen.getByRole('button', { name: 'Generating backup...' }) as HTMLButtonElement;
        expect(loadingButton.disabled).toBe(true);
        expect((screen.getByRole('checkbox', { name: /^Metadata and limits/ }) as HTMLInputElement).disabled).toBe(true);
        expect(screen.getByRole('status').textContent).toContain('Preparing ZIP archive');

        deferredResponse.resolve(
            new Response(new Blob(['backup-bytes']), {
                status: 200,
                headers: {
                    'Content-Disposition': 'attachment; filename="backup.zip"',
                },
            }),
        );

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect((screen.getByRole('button', { name: 'Download full backup' }) as HTMLButtonElement).disabled).toBe(false);
        });
    });
});
