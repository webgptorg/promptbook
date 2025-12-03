import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ agentName: string }> }
) {
    try {
        const { agentName } = await params;
        // agentName is likely the federated server URL (e.g., "https://s6.ptbk.io")
        // It comes decoded from the URL params if it was encoded in the request path
        
        let serverUrl = agentName;

        // If the serverUrl doesn't look like a URL, it might be just a hostname or something else
        // But the requirement says we look for /agents/[federated-server]/api/agents
        // The client will likely pass the full URL or hostname.
        // We'll assume if it doesn't start with http, we might need to prepend it, or it's invalid.
        // However, the current federated servers list contains full URLs.
        
        // If it was somehow double encoded or something, we might need to handle it, but standard Next.js behavior is single decode.
        
        if (!serverUrl.startsWith('http')) {
             // Maybe it is just a hostname?
             // Let's try to assume https if missing
             if (serverUrl.includes('.')) {
                 serverUrl = `https://${serverUrl}`;
             } else {
                 return NextResponse.json(
                    { error: 'Invalid federated server URL' },
                    { status: 400 }
                );
             }
        }

        // Normalize URL (remove trailing slash)
        serverUrl = serverUrl.replace(/\/$/, '');

        const response = await fetch(`${serverUrl}/api/agents`, {
            // Forward relevant headers if necessary, or just basic fetch
            headers: {
                'Content-Type': 'application/json',
                // Add any other needed headers
            },
            next: { revalidate: 600 }, // Cache for 10 minutes
        });

        if (!response.ok) {
            console.warn(`Proxy failed to fetch agents from ${serverUrl}: ${response.status} ${response.statusText}`);
            return NextResponse.json(
                { error: `Failed to fetch from ${serverUrl}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Proxy error fetching federated agents:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
