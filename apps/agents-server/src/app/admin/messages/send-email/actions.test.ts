import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotAllowed } from '../../../../../../../src/errors/NotAllowed';
import { sendEmailThroughStalwart } from '../../../../utils/email/sendEmailThroughStalwart';
import { getEmailTestingAccessContext } from './emailTestingAccess';
import { sendEmailAction } from './actions';

jest.mock('../../../../utils/email/sendEmailThroughStalwart', () => ({
    sendEmailThroughStalwart: jest.fn(),
}));

jest.mock('./emailTestingAccess', () => ({
    getEmailTestingAccessContext: jest.fn(),
}));

/**
 * Mocked Stalwart delivery entry point used by administration email-action tests.
 */
const sendEmailThroughStalwartMock = sendEmailThroughStalwart as jest.MockedFunction<typeof sendEmailThroughStalwart>;

/**
 * Mocked administration email access resolver used by email-action tests.
 */
const getEmailTestingAccessContextMock = getEmailTestingAccessContext as jest.MockedFunction<
    typeof getEmailTestingAccessContext
>;

/**
 * Builds a complete valid email testing form submission.
 */
function createEmailTestingFormData(from: string): FormData {
    const formData = new FormData();
    formData.set('from', from);
    formData.set('to', 'recipient@example.com');
    formData.set('subject', 'Testing subject');
    formData.set('body', 'Testing body');
    return formData;
}

describe('sendEmailAction', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sendEmailThroughStalwartMock.mockResolvedValue();
        getEmailTestingAccessContextMock.mockResolvedValue({
            currentServerDomain: 'server.example.com',
            isGlobalAdmin: false,
        });
    });

    it('sends an allowed current-server email through the shared Stalwart delivery flow', async () => {
        await sendEmailAction(createEmailTestingFormData('Testing Agent <agent@server.example.com>'));

        expect(sendEmailThroughStalwartMock).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: 'EMAIL',
                direction: 'OUTBOUND',
                sender: '"Testing Agent" <agent@server.example.com>',
                recipients: ['recipient@example.com'],
                subject: 'Testing subject',
                content: 'Testing body',
            }),
        );
    });

    it('rejects a normal admin sender outside the current server before delivery', async () => {
        await expect(sendEmailAction(createEmailTestingFormData('agent@other.example.com'))).rejects.toThrow(NotAllowed);
        expect(sendEmailThroughStalwartMock).not.toHaveBeenCalled();
    });

    it('allows the superadmin to send through the same delivery flow from another domain', async () => {
        getEmailTestingAccessContextMock.mockResolvedValue({
            currentServerDomain: 'server.example.com',
            isGlobalAdmin: true,
        });

        await sendEmailAction(createEmailTestingFormData('agent@other.example.com'));

        expect(sendEmailThroughStalwartMock).toHaveBeenCalledWith(
            expect.objectContaining({ sender: 'agent@other.example.com' }),
        );
    });

    it('rejects an unauthenticated server-action invocation before delivery', async () => {
        getEmailTestingAccessContextMock.mockResolvedValue(null);

        await expect(sendEmailAction(createEmailTestingFormData('agent@server.example.com'))).rejects.toThrow(NotAllowed);
        expect(sendEmailThroughStalwartMock).not.toHaveBeenCalled();
    });
});
