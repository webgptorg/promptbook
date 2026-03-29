/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, jest } from '@jest/globals';
import type { ChatMessage } from '../types/ChatMessage';
import type { ChatParticipant } from '../types/ChatParticipant';
import { ChatMessageItem } from './ChatMessageItem';

jest.mock('../CodeBlock/CodeBlock', () => ({
    CodeBlock: ({ code }: { code: string }) => <pre>{code}</pre>,
}));

jest.mock('./ChatMessageMap', () => ({
    ChatMessageMap: () => null,
}));

/**
 * Shared assistant participant fixture used by chat-message citation tests.
 */
const AGENT_PARTICIPANT_FIXTURE: ChatParticipant = {
    name: 'AGENT',
    fullname: 'Agent',
    color: '#ffffff',
};

/**
 * Creates one minimal assistant message fixture for citation-footnote rendering tests.
 */
function createAssistantMessageFixture(): ChatMessage {
    return {
        id: 'assistant-message-1',
        sender: 'AGENT',
        content: 'Alpha [0:0] and beta [8:13].',
        citations: [
            { id: '0:0', source: 'document123.doc' },
            { id: '8:13', source: 'document123.doc' },
        ],
        isComplete: true,
    };
}

describe('ChatMessageItem citation footnotes', () => {
    it('renders repeated document citations as one footnote chip and removes raw marker ids from the message body', () => {
        const { container } = render(
            <ChatMessageItem
                message={createAssistantMessageFixture()}
                participant={AGENT_PARTICIPANT_FIXTURE}
                participants={[AGENT_PARTICIPANT_FIXTURE]}
                isLastMessage={true}
                setExpandedMessageId={() => undefined}
                isExpanded={false}
                currentRating={0}
                handleRating={() => undefined}
                mode="LIGHT"
            />,
        );

        expect(container.textContent).not.toContain('[0:0]');
        expect(container.textContent).not.toContain('[8:13]');
        expect(container.querySelectorAll('sup[data-citation-footnote="1"]')).toHaveLength(2);
        expect(screen.getAllByTitle('document123.doc')).toHaveLength(1);
        expect(screen.getByTitle('document123.doc').textContent).not.toContain('[0:0]');
        expect(screen.getByTitle('document123.doc').textContent).not.toContain('[8:13]');
    });
});
