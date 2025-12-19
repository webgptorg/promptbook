import { ElevenLabsRealtimeAgent } from '../../components/ElevenLabsRealtimeAgent';

export default function ElevenLabsRealtimeAgentPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <h1 className="text-3xl font-bold mb-8 text-gray-800">ElevenLabs Realtime Agent</h1>
            <div className="bg-white rounded-2xl shadow-xl p-8">
                <ElevenLabsRealtimeAgent systemMessage="You are a helpful assistant." />
            </div>
        </div>
    );
}
