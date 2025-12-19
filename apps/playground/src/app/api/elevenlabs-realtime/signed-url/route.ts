import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        const agentId = process.env.ELEVENLABS_AGENT_ID;

        if (!apiKey || !agentId) {
            return NextResponse.json({ error: 'ELEVENLABS_API_KEY or ELEVENLABS_AGENT_ID is not set' }, { status: 500 });
        }

        const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`, {
            method: 'GET',
            headers: {
                'xi-api-key': apiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs API Error:', errorText);
            return NextResponse.json({ error: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json({ signedUrl: data.signed_url });
    } catch (error) {
        console.error('Server Error:', error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
