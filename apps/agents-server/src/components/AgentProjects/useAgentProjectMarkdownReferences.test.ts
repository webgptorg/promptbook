/** @jest-environment jsdom */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
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

const startAgentProjectRuntimeActionMock = jest.mocked($startAgentProjectRuntimeAction);
const stopAgentProjectRuntimeActionMock = jest.mocked($stopAgentProjectRuntimeAction);
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
});
