/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { ExternalUserChatAdminActions } from './ExternalUserChatAdminActions';

describe('ExternalUserChatAdminActions', () => {
    it('links to the owner and the owner-filtered chat history', () => {
        render(
            <ExternalUserChatAdminActions
                agentName="school-agent"
                chatId="chat-123"
                userId={42}
                chatTitle="Recorded chat"
                messages={[]}
            />,
        );

        expect(screen.getByRole('link', { name: 'User #42' }).getAttribute('href')).toBe('/admin/users/42');
        expect(screen.getByRole('link', { name: 'Chat history' }).getAttribute('href')).toBe(
            '/admin/chat-history?agentName=school-agent&userId=42&chatId=chat-123&view=chat',
        );
    });
});
