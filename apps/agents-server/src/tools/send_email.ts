import { OutboundEmail } from '../message-providers/email/_common/Email';
import { parseEmailAddresses } from '../message-providers/email/_common/utils/parseEmailAddresses';
import { sendMessage } from '../utils/messages/sendMessage';

/**
 * Builds a JSON tool result for the send_email tool.
 *
 * @param payload - Email metadata and delivery status details
 * @returns Serialized JSON string for tool output
 */
function buildSendEmailToolResult(payload: {
    status: 'queued' | 'sent';
    message: string;
    from: string;
    to: string[];
    cc: string[];
    subject: string;
    body: string;
}): string {
    return JSON.stringify(payload);
}

/**
 * Tool function for sending emails from agents
 * This implements the send_email tool for the USE EMAIL commitment
 */
export async function send_email(args: {
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
}): Promise<string> {
    console.log('!!!! [Tool] send_email called', { args });

    const { to, cc = [], subject, body } = args;

    try {
        // Parse recipient addresses
        const recipients = parseEmailAddresses(to.join(', '));
        const ccAddresses = cc.length > 0 ? parseEmailAddresses(cc.join(', ')) : [];

        if (recipients.length === 0) {
            throw new Error('At least one valid recipient email address is required');
        }

        // Get admin email as sender (from environment or metadata)
        const senderEmail = process.env.ADMIN_EMAIL || 'noreply@ptbk.io';
        const [senderAddress] = parseEmailAddresses(senderEmail);

        if (!senderAddress) {
            throw new Error('Invalid sender email address configuration');
        }

        const recipientsList = recipients.map((email) => email.fullEmail);
        const ccList = ccAddresses.map((email) => email.fullEmail);

        // Construct the email message
        const email: OutboundEmail = {
            channel: 'EMAIL',
            direction: 'OUTBOUND',
            sender: senderAddress.fullEmail,
            recipients: recipientsList,
            cc: ccAddresses, // <- TODO: !!!!! Why `sender` and `recipients` are strings but `cc` is object
            subject,
            content: body, // Body is already in markdown format
            attachments: [], // No attachments support yet
            threadId: undefined, // No threading support yet
            metadata: {
                subject, // Store subject in metadata for compatibility
            },
        };

        // Send the email using the existing email queue system
        await sendMessage(email);

        // Return success message with details
        const message = `Email sent successfully to ${recipientsList.join(', ')}${
            ccList.length > 0 ? ` (CC: ${ccList.join(', ')})` : ''
        }`;

        return buildSendEmailToolResult({
            status: 'queued',
            message,
            from: senderAddress.fullEmail,
            to: recipientsList,
            cc: ccList,
            subject,
            body,
        });
    } catch (error) {
        console.error('[Tool] send_email error:', error);
        throw new Error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
    }
}
