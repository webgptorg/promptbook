/**
 * Client-side safe wrapper for sending emails.
 *
 * This function proxies requests to the Agents Server API endpoint for email queuing,
 * making it safe to use in browser environments.
 *
 * @param args Email payload containing recipients, subject, and body
 * @param agentsServerUrl The base URL of the agents server (defaults to current origin)
 * @returns Result string from the server-side send_email tool
 *
 * @private internal utility for USE EMAIL commitment
 */
export async function sendEmailViaBrowser(
    args: { to: string[]; cc?: string[]; subject: string; body: string },
    agentsServerUrl?: string,
): Promise<string> {
    try {
        const baseUrl = agentsServerUrl || (typeof window !== 'undefined' ? window.location.origin : '');

        if (!baseUrl) {
            throw new Error('Agents server URL is required in non-browser environments');
        }

        const apiUrl = new URL('/api/send-email', baseUrl);

        const response = await fetch(apiUrl.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(args),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Failed to send email: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(`Email sending failed: ${data.error || 'Unknown error'}`);
        }

        return typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Error sending email via browser: ${errorMessage}`);
    }
}
