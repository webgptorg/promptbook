/** @jest-environment jsdom */

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';

let searchParamsMock = new URLSearchParams();

jest.mock('next/navigation', () => ({
    useSearchParams: () => searchParamsMock,
}));

jest.mock('./AgentsList', () => ({
    AgentsList: ({
        showFederatedAgents,
        isSubfolderView,
    }: {
        readonly showFederatedAgents: boolean;
        readonly isSubfolderView: boolean;
    }) => (
        <div
            data-testid="agents-list"
            data-show-federated-agents={String(showFederatedAgents)}
            data-is-subfolder-view={String(isSubfolderView)}
        />
    ),
}));

jest.mock('./HomepageMessage', () => ({
    HomepageMessage: ({ message }: { readonly message: string | null }) => (
        <div data-testid="homepage-message">{message}</div>
    ),
}));

jest.mock('./ExternalAgentsSectionClient', () => ({
    ExternalAgentsSectionClient: ({ publicUrl }: { readonly publicUrl: string }) => (
        <div data-testid="external-agents">{publicUrl}</div>
    ),
}));

import { AgentsHomePageContent } from './AgentsHomePageContent';

describe('AgentsHomePageContent', () => {
    beforeEach(() => {
        searchParamsMock = new URLSearchParams();
    });

    it('shows the root homepage extras when list view is active at the top level', () => {
        render(
            <AgentsHomePageContent
                agents={[]}
                folders={[]}
                isAdmin={false}
                canOrganize={false}
                publicUrl="https://agents.example.com/"
                homepageMessage="Hello world"
            />,
        );

        expect(screen.getByTestId('homepage-message').textContent).toBe('Hello world');
        expect(screen.getByTestId('external-agents').textContent).toBe('https://agents.example.com/');
        expect(screen.getByTestId('agents-list').getAttribute('data-show-federated-agents')).toBe('true');
        expect(screen.getByTestId('agents-list').getAttribute('data-is-subfolder-view')).toBe('false');
    });

    it('hides the root-only homepage extras while browsing inside a folder', () => {
        searchParamsMock = new URLSearchParams('folder=Operations');

        render(
            <AgentsHomePageContent
                agents={[]}
                folders={[]}
                isAdmin={false}
                canOrganize={false}
                publicUrl="https://agents.example.com/"
                homepageMessage="Hello world"
            />,
        );

        expect(screen.queryByTestId('homepage-message')).toBeNull();
        expect(screen.queryByTestId('external-agents')).toBeNull();
        expect(screen.getByTestId('agents-list').getAttribute('data-show-federated-agents')).toBe('false');
        expect(screen.getByTestId('agents-list').getAttribute('data-is-subfolder-view')).toBe('true');
    });

    it('hides the external agents section outside of list view even at the top level', () => {
        searchParamsMock = new URLSearchParams('view=graph');

        render(
            <AgentsHomePageContent
                agents={[]}
                folders={[]}
                isAdmin={false}
                canOrganize={false}
                publicUrl="https://agents.example.com/"
                homepageMessage="Hello world"
            />,
        );

        expect(screen.getByTestId('homepage-message').textContent).toBe('Hello world');
        expect(screen.queryByTestId('external-agents')).toBeNull();
        expect(screen.getByTestId('agents-list').getAttribute('data-show-federated-agents')).toBe('true');
    });
});
