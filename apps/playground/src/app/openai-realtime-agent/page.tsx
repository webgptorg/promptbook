import { OpenAIRealtimeAgent } from '../../components/OpenAIRealtimeAgent';

export default function OpenAIRealtimeAgentPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-8">OpenAI Realtime Agent</h1>
            <OpenAIRealtimeAgent systemMessage="You are a helpful assistant. Be concise." />
        </div>
    );
}
