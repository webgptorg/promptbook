import { handleChatCompletion } from '@/src/utils/handleChatCompletion';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
    return handleChatCompletion(request, {}, 'OpenAI API Chat Completion (Global)');
}
