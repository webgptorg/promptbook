/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ChatMessage } from '@promptbook-local/types';
import { $refreshAgentProjectChatReferencesAction } from '../../app/agents/[agentName]/projectReferenceActions';
import {
    $startAgentProjectRuntimeAction,
    $stopAgentProjectRuntimeAction,
} from '../../app/agents/[agentName]/projectRuntimeActions';
import type { AgentProjectReferenceInfo } from '../../utils/agentProjects/AgentProjectReferenceInfo';
import { notifyError } from '../Notifications/notifications';
import { useAgentProjectMarkdownReferences } from './useAgentProjectMarkdownReferences';

jest.mock('../../app/agents/[agentName]/projectRuntimeActions', () => ({
    $startAgentProjectRuntimeAction: jest.fn(),
    $stopAgentProjectRuntimeAction: jest.fn(),
}));

jest.mock('../../app/agents/[agentName]/projectReferenceActions', () => ({
    $refreshAgentProjectChatReferencesAction: jest.fn(),
}));

jest.mock('../Notifications/notifications', () => ({
    notifyError: jest.fn(),
}));

/**
 * Stopped project used by project-reference hook tests.
 */
const STOPPED_PROJECT: AgentProjectReferenceInfo = {
    projectName: 'website-studio',
    displayName: 'Website Studio',
    description: 'Project reference test',
    sizeBytes: 100,
    faviconRelativePath: 'favicon.svg',
    isRunning: false,
    projectUrl: 'https://website.example.com',
};

/**
 * Project the agent creates while the chat stays open.
 */
const CREATED_PROJECT: AgentProjectReferenceInfo = {
    projectName: 'prague-news-map',
    displayName: 'Prague News Map',
    description: 'Created during the conversation',
    sizeBytes: 200,
    faviconRelativePath: 'favicon.ico',
    isRunning: true,
    projectUrl: 'https://prague-news-map.example.com',
};

/**
 * Chat thread ending with one finished agent answer.
 */
const ANSWERED_MESSAGES = [
    { id: 'message-1', sender: 'USER', content: 'Make me a project' },
    { id: 'message-2', sender: 'AGENT', content: 'Done', isComplete: true },
] as unknown as ReadonlyArray<ChatMessage>;

const startAgentProjectRuntimeActionMock = jest.mocked($startAgentProjectRuntimeAction);
const stopAgentProjectRuntimeActionMock = jest.mocked($stopAgentProjectRuntimeAction);
const refreshAgentProjectChatReferencesActionMock = jest.mocked($refreshAgentProjectChatReferencesAction);
const notifyErrorMock = jest.mocked(notifyError);

describe('useAgentProjectMarkdownReferences', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        startAgentProjectRuntimeActionMock.mockResolvedValue({
            isRunning: true,
            projectUrl: 'https://website.example.com',
        });
        stopAgentProjectRuntimeActionMock.mockResolvedValue({
            isRunning: false,
            projectUrl: 'https://website.example.com',
        });
        refreshAgentProjectChatReferencesActionMock.mockResolvedValue(null);
    });

    it('starts and stops a project while updating the chip status and runtime action', async () => {
        const { result } = renderHook(() =>
            useAgentProjectMarkdownReferences({
                agentPermanentId: 'agent-1',
                projects: [STOPPED_PROJECT],
            }),
        );

        expect(result.current[0]?.menu?.status.isActive).toBe(false);
        expect(result.current[0]?.menu?.options[2]?.label).toBe('Start the project');

        await act(async () => {
            await result.current[0]?.menu?.options[2]?.action?.onSelect();
        });

        expect(startAgentProjectRuntimeActionMock).toHaveBeenCalledWith('agent-1', 'website-studio');
        expect(result.current[0]?.menu?.status.isActive).toBe(true);
        expect(result.current[0]?.menu?.options[2]?.label).toBe('Stop the project');

        await act(async () => {
            await result.current[0]?.menu?.options[2]?.action?.onSelect();
        });

        expect(stopAgentProjectRuntimeActionMock).toHaveBeenCalledWith('agent-1', 'website-studio');
        expect(result.current[0]?.menu?.status.isActive).toBe(false);
        expect(result.current[0]?.menu?.options[2]?.label).toBe('Start the project');
        expect(notifyErrorMock).not.toHaveBeenCalled();
    });

    it('opens a tab immediately, starts a stopped project, and navigates the tab to its URL', async () => {
        const projectWindow = {
            close: jest.fn(),
            location: { href: 'about:blank' },
            opener: window,
        };
        const openWindowMock = jest.spyOn(window, 'open').mockReturnValue(projectWindow as unknown as Window);
        const { result } = renderHook(() =>
            useAgentProjectMarkdownReferences({
                agentPermanentId: 'agent-1',
                projects: [STOPPED_PROJECT],
            }),
        );

        await act(async () => {
            await result.current[0]?.menu?.options[0]?.action?.onSelect();
        });

        expect(openWindowMock).toHaveBeenCalledWith('about:blank', '_blank');
        expect(startAgentProjectRuntimeActionMock).toHaveBeenCalledWith('agent-1', 'website-studio');
        expect(projectWindow.opener).toBeNull();
        expect(projectWindow.location.href).toBe('https://website.example.com');
        expect(projectWindow.close).not.toHaveBeenCalled();
        expect(result.current[0]?.menu?.status.isActive).toBe(true);
    });

    it('keeps the server references while the chat only renders answers it already knows', async () => {
        const { rerender } = renderHook(
            (messages: ReadonlyArray<ChatMessage>) =>
                useAgentProjectMarkdownReferences({
                    agentPermanentId: 'agent-1',
                    projects: [STOPPED_PROJECT],
                    messages,
                }),
            { initialProps: [] as unknown as ReadonlyArray<ChatMessage> },
        );

        await act(async () => {
            rerender(ANSWERED_MESSAGES);
        });

        expect(refreshAgentProjectChatReferencesActionMock).not.toHaveBeenCalled();
    });

    it('renders a project created during the conversation as a chip without a page reload', async () => {
        refreshAgentProjectChatReferencesActionMock.mockResolvedValue([STOPPED_PROJECT, CREATED_PROJECT]);

        const { result, rerender } = renderHook(
            (messages: ReadonlyArray<ChatMessage>) =>
                useAgentProjectMarkdownReferences({
                    agentPermanentId: 'agent-1',
                    projects: [STOPPED_PROJECT],
                    messages,
                }),
            { initialProps: ANSWERED_MESSAGES },
        );

        expect(result.current).toHaveLength(1);

        await act(async () => {
            rerender([
                ...ANSWERED_MESSAGES,
                { id: 'message-3', sender: 'USER', content: 'And a map of the news' },
                {
                    id: 'message-4',
                    sender: 'AGENT',
                    content: 'Open the project here: Prague News Map',
                    isComplete: true,
                },
            ] as unknown as ReadonlyArray<ChatMessage>);
        });

        expect(refreshAgentProjectChatReferencesActionMock).toHaveBeenCalledWith('agent-1', ['website-studio']);
        expect(result.current).toHaveLength(2);
        expect(result.current[1]?.reference).toBe('prague-news-map');
        expect(result.current[1]?.label).toBe('Prague News Map');
        expect(result.current[1]?.sourceHrefPrefixes).toContain('https://prague-news-map.example.com');
    });

    it('renders a project created by the very first answer of a chat which starts with no greeting', async () => {
        refreshAgentProjectChatReferencesActionMock.mockResolvedValue([CREATED_PROJECT]);

        const { result, rerender } = renderHook(
            (messages: ReadonlyArray<ChatMessage>) =>
                useAgentProjectMarkdownReferences({
                    agentPermanentId: 'agent-1',
                    projects: [],
                    messages,
                }),
            {
                initialProps: [
                    { id: 'message-1', sender: 'USER', content: 'Make me a project' },
                    { id: 'message-2', sender: 'AGENT', content: 'Working…', isComplete: false },
                ] as unknown as ReadonlyArray<ChatMessage>,
            },
        );

        expect(result.current).toHaveLength(0);

        await act(async () => {
            rerender([
                { id: 'message-1', sender: 'USER', content: 'Make me a project' },
                {
                    id: 'message-2',
                    sender: 'AGENT',
                    content: 'Open the project here: Prague News Map',
                    isComplete: true,
                },
            ] as unknown as ReadonlyArray<ChatMessage>);
        });

        expect(refreshAgentProjectChatReferencesActionMock).toHaveBeenCalledWith('agent-1', []);
        expect(result.current).toHaveLength(1);
        expect(result.current[0]?.label).toBe('Prague News Map');
    });

    it('does not reload the references while the newest answer is still being generated', async () => {
        const { rerender } = renderHook(
            (messages: ReadonlyArray<ChatMessage>) =>
                useAgentProjectMarkdownReferences({
                    agentPermanentId: 'agent-1',
                    projects: [STOPPED_PROJECT],
                    messages,
                }),
            { initialProps: ANSWERED_MESSAGES },
        );

        await act(async () => {
            rerender([
                ...ANSWERED_MESSAGES,
                { id: 'message-3', sender: 'AGENT', content: 'Reading the project files…', isComplete: false },
            ] as unknown as ReadonlyArray<ChatMessage>);
        });

        expect(refreshAgentProjectChatReferencesActionMock).not.toHaveBeenCalled();
    });
});
