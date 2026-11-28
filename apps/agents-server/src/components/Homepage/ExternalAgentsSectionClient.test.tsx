/** @jest-environment jsdom */

import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ExternalAgentsSectionClient } from './ExternalAgentsSectionClient';

jest.mock('./AgentCardsSection', () => ({
    AgentCardsSection: ({ title }: { readonly title: ReactNode }) => <div>{title}</div>,
}));

/**
 * Original fetch implementation restored after each homepage federation test.
 */
const ORIGINAL_FETCH = global.fetch;

describe('ExternalAgentsSectionClient', () => {
    afterEach(() => {
        global.fetch = ORIGINAL_FETCH;
        jest.restoreAllMocks();
    });

    it('does not render a federated-agents loading section before the server list is loaded', async () => {
        let resolveFederatedServersResponse: (response: Response) => void = () => undefined;
        const federatedServersResponse = new Promise<Response>((resolve) => {
            resolveFederatedServersResponse = resolve;
        });
        global.fetch = jest.fn(() => federatedServersResponse) as typeof fetch;

        render(<ExternalAgentsSectionClient publicUrl="https://local.example" />);

        expect(screen.queryByText('Federated agents')).toBeNull();
        expect(screen.queryByRole('status', { name: 'Loading federated agents' })).toBeNull();

        resolveFederatedServersResponse(
            new Response(JSON.stringify({ federatedServers: [] }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
            }),
        );

        await waitFor(() => expect(screen.queryByText('Federated agents')).toBeNull());
    });
});
