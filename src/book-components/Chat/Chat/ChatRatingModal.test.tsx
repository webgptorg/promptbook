/** @jest-environment jsdom */

import { describe, expect, it } from '@jest/globals';
import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import type { ChatMessage } from '../types/ChatMessage';
import { ChatRatingModal } from './ChatRatingModal';

/**
 * Shared user message fixture used by chat rating modal tests.
 */
const USER_MESSAGE_FIXTURE: ChatMessage = {
    id: 'user-message-1',
    sender: 'USER',
    content: 'What can it do?',
};

/**
 * Shared assistant message fixture used by chat rating modal tests.
 */
const ASSISTANT_MESSAGE_FIXTURE: ChatMessage = {
    id: 'assistant-message-1',
    sender: 'AGENT',
    content: 'It can answer common questions.',
    isComplete: true,
};

/**
 * Renders the chat rating modal with stable defaults used by these tests.
 */
function renderChatRatingModal(overrides: Partial<ComponentProps<typeof ChatRatingModal>> = {}) {
    return render(
        <ChatRatingModal
            isOpen={true}
            selectedMessage={ASSISTANT_MESSAGE_FIXTURE}
            postprocessedMessages={[USER_MESSAGE_FIXTURE, ASSISTANT_MESSAGE_FIXTURE]}
            messages={[USER_MESSAGE_FIXTURE, ASSISTANT_MESSAGE_FIXTURE]}
            hoveredRating={0}
            messageRatings={new Map([[ASSISTANT_MESSAGE_FIXTURE.id!, 2]])}
            textRating=""
            feedbackMode="stars"
            mode="LIGHT"
            isMobile={false}
            onClose={() => undefined}
            setHoveredRating={() => undefined}
            setMessageRatings={() => undefined}
            setSelectedMessage={() => undefined}
            setTextRating={() => undefined}
            submitRating={async () => undefined}
            {...overrides}
        />,
    );
}

describe('ChatRatingModal feedback stars', () => {
    it('only colors picked modal feedback stars as active', () => {
        const { container } = renderChatRatingModal();

        const starElements = Array.from(
            container.querySelectorAll<HTMLElement>('span[style*="--chat-feedback-star-color"]'),
        );

        expect(
            starElements.map((starElement) => starElement.style.getPropertyValue('--chat-feedback-star-color')),
        ).toEqual(['#ffd700', '#ffd700', '#ccc', '#ccc', '#ccc']);
        expect(
            starElements.map((starElement) => starElement.style.getPropertyValue('--chat-feedback-star-fill')),
        ).toEqual(['currentColor', 'currentColor', 'none', 'none', 'none']);
        expect(starElements.map((starElement) => starElement.style.color)).toEqual([
            'rgb(255, 215, 0)',
            'rgb(255, 215, 0)',
            'rgb(204, 204, 204)',
            'rgb(204, 204, 204)',
            'rgb(204, 204, 204)',
        ]);
        const starIconElements = Array.from(
            container.querySelectorAll<SVGElement>('span[style*="--chat-feedback-star-color"] svg'),
        );

        expect(starIconElements.map((starIconElement) => starIconElement.getAttribute('fill'))).toEqual([
            'currentColor',
            'currentColor',
            'none',
            'none',
            'none',
        ]);
        expect(starIconElements.map((starIconElement) => starIconElement.style.getPropertyValue('fill'))).toEqual([
            'currentColor',
            'currentColor',
            'none',
            'none',
            'none',
        ]);
        expect(container.textContent).not.toContain('⭐');
    });
});
