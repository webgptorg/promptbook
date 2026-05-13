import {
    createExternalChatQueuedMessageBook,
    parseExternalChatFailedMessageBook,
    parseExternalChatFinishedMessageBook,
} from './externalChatMessageBook';

describe('externalChatMessageBook', () => {
    it('serializes one whole chat thread into a queued `.book` file', () => {
        expect(
            createExternalChatQueuedMessageBook({
                messages: [
                    { sender: 'USER', content: 'First question' },
                    { sender: 'AGENT', content: 'First answer' },
                    { sender: 'USER', content: 'Second question' },
                ],
            }),
        ).toBe(
            'MESSAGE @User\nFirst question\n\nMESSAGE @Agent\nFirst answer\n\nMESSAGE @User\nSecond question\n',
        );
    });

    it('extracts the agent answer only when the expected queued turn is finished', () => {
        expect(
            parseExternalChatFinishedMessageBook({
                bookContent:
                    'MESSAGE @User\nFirst question\n\nMESSAGE @Agent\nFirst answer\n\nMESSAGE @User\nSecond question\n\nMESSAGE @Agent\nSecond answer\n',
                expectedMessagesBeforeAnswer: 3,
            }),
        ).toBe('Second answer');
    });

    it('ignores stale finished files from an earlier thread state', () => {
        expect(
            parseExternalChatFinishedMessageBook({
                bookContent: 'MESSAGE @User\nFirst question\n\nMESSAGE @Agent\nFirst answer\n',
                expectedMessagesBeforeAnswer: 3,
            }),
        ).toBeNull();
    });

    it('returns a generic failure reason when failed file has no new agent message', () => {
        expect(
            parseExternalChatFailedMessageBook({
                bookContent: 'MESSAGE @User\nSecond question\n',
                expectedMessagesBeforeAnswer: 1,
            }),
        ).toBe('External chat runner moved the message to failed.');
    });
});
