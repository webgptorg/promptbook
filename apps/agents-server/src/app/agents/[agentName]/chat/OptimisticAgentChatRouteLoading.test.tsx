/** @jest-environment jsdom */

import { afterEach, describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { clearPendingProfileMessage, setPendingProfileMessage } from '../profileMessageCache';
import { OptimisticAgentChatRouteLoading } from './OptimisticAgentChatRouteLoading';

describe('OptimisticAgentChatRouteLoading', () => {
    afterEach(() => {
        clearPendingProfileMessage('test-agent');
        window.sessionStorage.clear();
    });

    it('renders the pending profile message immediately while the chat route loads', () => {
        setPendingProfileMessage('test-agent', {
            message: 'Hello from the profile handoff',
            clientMessageId: 'client-message-1',
            agentDisplayName: 'Test Agent',
            brandColorHex: '#123456',
            inputPlaceholder: 'Ask anything',
        });

        render(<OptimisticAgentChatRouteLoading agentName="test-agent" />);

        expect(screen.getByText('Test Agent')).not.toBeNull();
        expect(screen.getByText('Hello from the profile handoff')).not.toBeNull();
        expect(screen.getByText('Sending...')).not.toBeNull();
        expect(screen.getByText('Ask anything')).not.toBeNull();
    });

    it('falls back to the attachment count when the pending profile turn contains only uploads', () => {
        setPendingProfileMessage('test-agent', {
            attachments: [
                {
                    url: 'https://example.com/report.pdf',
                    name: 'report.pdf',
                    type: 'application/pdf',
                },
            ],
        });

        render(<OptimisticAgentChatRouteLoading agentName="test-agent" />);

        expect(screen.getByText('1 attachment')).not.toBeNull();
    });
});
