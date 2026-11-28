/** @jest-environment jsdom */

import type { AgentBasicInformation, string_agent_permanent_id, string_url } from '@promptbook-local/types';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { AgentProfile } from './AgentProfile';
import { resolveAgentAvatar } from '../../../../../src/utils/agents/resolveAgentAvatarImageUrl';

/**
 * Captures the props forwarded into the shared built-in avatar renderer.
 */
const mockAgentAvatar = jest.fn();

/**
 * Captures the props forwarded into the explicit profile image renderer.
 */
const mockAgentProfileImage = jest.fn();

jest.mock('../../../../../src/utils/agents/resolveAgentAvatarImageUrl', () => ({
    resolveAgentAvatar: jest.fn(),
}));

jest.mock('../AgentAvatar/AgentAvatar', () => ({
    AgentAvatar: (props: Record<string, unknown>) => {
        mockAgentAvatar(props);

        return <div data-testid="agent-avatar" />;
    },
}));

jest.mock('./AgentProfileImage', () => ({
    AgentProfileImage: (props: Record<string, unknown>) => {
        mockAgentProfileImage(props);

        return <div data-testid="agent-profile-image" />;
    },
}));

jest.mock('./AgentCapabilityChips', () => ({
    AGENT_PROFILE_CAPABILITY_CHIPS_LIMIT: 4,
    AgentCapabilityChips: () => <div>Capability chips</div>,
}));

jest.mock('./AgentProfileDescription', () => ({
    AgentProfileDescription: ({ text }: { text: string }) => <div>{text}</div>,
}));

jest.mock('./AgentQrCode', () => ({
    AgentQrCode: () => <div>QR code</div>,
}));

jest.mock('./QrCodeModal', () => ({
    QrCodeModal: () => null,
}));

jest.mock('./useAgentBackground', () => ({
    useAgentBackground: () => ({
        brandColorHex: '#336699',
        brandColorLightHex: '#99ccee',
        brandColorDarkHex: '#224466',
        backgroundImage: 'data:image/png;base64,profile-background',
    }),
}));

jest.mock('../AgentNaming/AgentNamingContext', () => ({
    useAgentNaming: () => ({
        formatText: (text: string) => text,
    }),
}));

/**
 * Minimal agent fixture used to render the profile card in avatar layout tests.
 */
const TEST_AGENT = {
    agentName: 'Octavia',
    agentHash: 'hash-octavia',
    meta: {
        fullname: 'Octavia',
        description: 'Helpful profile agent',
        color: '#336699',
    },
    personaDescription: 'Helpful profile agent',
    capabilities: [],
} as unknown as AgentBasicInformation;

describe('AgentProfile', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('centers built-in avatar visuals inside a constrained square stage on the profile card', () => {
        const resolveAgentAvatarMock = resolveAgentAvatar as jest.MockedFunction<typeof resolveAgentAvatar>;

        resolveAgentAvatarMock.mockReturnValue({
            type: 'visual',
            visualId: 'octopus3',
            avatarDefinition: {
                agentName: 'Octavia',
                agentHash: 'hash-octavia',
                colors: ['#336699'],
            },
        });

        render(
            <AgentProfile
                agent={TEST_AGENT}
                permanentId={'agent-octavia' as string_agent_permanent_id}
                publicUrl={'https://example.com' as string_url}
            />,
        );

        const avatar = screen.getByTestId('agent-avatar');
        const visualStage = avatar.parentElement;
        const visualShell = visualStage?.parentElement;

        expect(visualStage).not.toBeNull();
        expect(visualStage?.className).toContain('aspect-square');
        expect(visualStage?.className).toContain('w-[80%]');
        expect(visualStage?.className).not.toContain('h-full');
        expect(visualStage?.className).toContain('items-center');
        expect(visualStage?.className).toContain('justify-center');

        expect(visualShell).not.toBeNull();
        expect(visualShell?.className).toContain('items-center');
        expect(visualShell?.className).toContain('justify-center');

        const renderedAvatarProps = mockAgentAvatar.mock.calls[0]?.[0] as {
            className: string;
            style: Record<string, string>;
            size: number;
            alt: string;
        };

        expect(mockAgentAvatar).toHaveBeenCalledTimes(1);
        expect(renderedAvatarProps.alt).toBe('Octavia');
        expect(renderedAvatarProps.size).toBe(420);
        expect(renderedAvatarProps.className).toContain('!h-full');
        expect(renderedAvatarProps.className).toContain('!w-full');
        expect(renderedAvatarProps.className).toContain('pointer-events-none');
        expect(renderedAvatarProps.className).toContain('select-none');
        expect(renderedAvatarProps.style.width).toBe('100%');
        expect(renderedAvatarProps.style.height).toBe('100%');
        expect(renderedAvatarProps.style.maxWidth).toBe('100%');
        expect(renderedAvatarProps.style.maxHeight).toBe('100%');
        expect(renderedAvatarProps.style.filter).toContain('drop-shadow');
    });

    it('contains explicit profile images inside the existing tall profile card', () => {
        const resolveAgentAvatarMock = resolveAgentAvatar as jest.MockedFunction<typeof resolveAgentAvatar>;

        resolveAgentAvatarMock.mockReturnValue({
            type: 'image',
            imageUrl: 'https://example.com/octavia-wide.png',
        } as ReturnType<typeof resolveAgentAvatar>);

        render(
            <AgentProfile
                agent={TEST_AGENT}
                permanentId={'agent-octavia' as string_agent_permanent_id}
                publicUrl={'https://example.com' as string_url}
            />,
        );

        const renderedImageProps = mockAgentProfileImage.mock.calls[0]?.[0] as {
            className: string;
            imageClassName: string;
            style: Record<string, string>;
        };

        expect(mockAgentProfileImage).toHaveBeenCalledTimes(1);
        expect(renderedImageProps.className).toContain('w-full');
        expect(renderedImageProps.className).toContain('h-full');
        expect(renderedImageProps.className).not.toContain('object-cover');
        expect(renderedImageProps.imageClassName).toContain('agent-avatar-pixelated');
        expect(renderedImageProps.imageClassName).toContain('object-contain');
        expect(renderedImageProps.imageClassName).not.toContain('object-cover');
        expect(renderedImageProps.style.backgroundImage).toContain('data:');
    });
});
