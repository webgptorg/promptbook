/** @jest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { WalletRecordDialog, type PendingWalletRecordRequest } from './WalletRecordDialog';

/**
 * Base request payload reused across wallet dialog regression tests.
 */
const BASE_GITHUB_WALLET_REQUEST: PendingWalletRecordRequest = {
    marker: 'wallet-request-test',
    sourceToolName: 'request_wallet_record',
    recordType: 'ACCESS_TOKEN',
    service: 'github',
    key: 'use-project-github-token',
    isUserScoped: false,
    isGlobal: false,
};

describe('WalletRecordDialog', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="portal-root"></div>';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('shows step-by-step GitHub token instructions when the manual USE PROJECT flow is opened', () => {
        render(
            <WalletRecordDialog
                isOpen
                request={BASE_GITHUB_WALLET_REQUEST}
                onSubmit={jest.fn()}
                onClose={jest.fn()}
                githubApp={{ isConfigured: true }}
            />,
        );

        expect(screen.queryByText('Manual GitHub token setup')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Add token manually' }));

        expect(screen.getByText('Manual GitHub token setup')).toBeInTheDocument();

        const settingsLink = screen.getByRole('link', { name: 'Open token settings in new tab' });
        expect(settingsLink).toHaveAttribute('href', 'https://github.com/settings/personal-access-tokens/new');
        expect(settingsLink).toHaveAttribute('target', '_blank');
        expect(settingsLink).toHaveAttribute('rel', 'noreferrer');

        const docsLink = screen.getByRole('link', { name: 'GitHub token docs in new tab' });
        expect(docsLink).toHaveAttribute(
            'href',
            'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens',
        );
        expect(docsLink).toHaveAttribute('target', '_blank');
        expect(docsLink).toHaveAttribute('rel', 'noreferrer');

        expect(
            screen.getByText(
                'Set repository permissions to Contents = Read and write and Pull requests = Read and write. Metadata can stay read-only.',
            ),
        ).toBeInTheDocument();
    });
});
