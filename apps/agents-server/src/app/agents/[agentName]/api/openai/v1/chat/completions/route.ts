import { handleChatCompletion } from '@/src/utils/handleChatCompletion';
import { NextRequest } from 'next/server';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ agentName: string }> },
) {
    const { agentName } = await params;
    return handleChatCompletion(request, { agentName }, 'OpenAI API Chat Completion');
}
