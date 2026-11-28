/** @jest-environment jsdom */

import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { MessageParticipants } from './MessageParticipants';
import { MessageStatus } from './MessageStatus';

describe('message administration table cells', () => {
    it('renders email participants as readable names and mail links', () => {
        render(
            <MessageParticipants
                channel="EMAIL"
                sender={'"Nový agent" <novy.agent@live2.ptbk.io>'}
                recipients={['pavol@ptbk.io']}
            />,
        );

        expect(screen.getByText('From')).toBeTruthy();
        expect(screen.getByText('To')).toBeTruthy();
        expect(screen.getByText('Nový agent')).toBeTruthy();
        expect(screen.getByRole('link', { name: 'novy.agent@live2.ptbk.io' }).getAttribute('href')).toBe(
            'mailto:novy.agent@live2.ptbk.io',
        );
        expect(screen.getByRole('link', { name: 'pavol@ptbk.io' }).getAttribute('href')).toBe('mailto:pavol@ptbk.io');
    });

    it('renders inbound messages as received rather than pending', () => {
        render(<MessageStatus direction="INBOUND" attempts={[]} />);

        expect(screen.getByText('Received')).toBeTruthy();
        expect(screen.queryByText('Pending')).toBeNull();
    });

    it('renders an immediate failure reason and an expandable complete provider log', () => {
        render(
            <MessageStatus
                direction="OUTBOUND"
                attempts={[
                    {
                        id: 3,
                        createdAt: '2026-08-11T16:59:30.654Z',
                        messageId: 17,
                        providerName: 'STALWART',
                        isSuccessful: false,
                        raw: {
                            error: {
                                name: 'Error',
                                message: 'connect ECONNREFUSED 127.0.0.1:587',
                                stack: 'Error: connect ECONNREFUSED 127.0.0.1:587\n    at TCPConnectWrap.afterConnect',
                            },
                        },
                    },
                ]}
            />,
        );

        expect(screen.getByText('Failed')).toBeTruthy();
        expect(screen.getByText('connect ECONNREFUSED 127.0.0.1:587')).toBeTruthy();
        expect(screen.getByText('Complete log')).toBeTruthy();
        expect(document.querySelector('pre')?.textContent).toContain(
            'Stack:\nError: connect ECONNREFUSED 127.0.0.1:587',
        );
    });
});
