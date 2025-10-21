import { Eye } from 'lucide-react';
import CountingUtilitiesPreview from './CountingUtilitiesPreview';

export default function CountingUtilitiesPreviewWrapper() {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Eye className="h-5 w-5 mr-2" />
                        Miniapp
                    </h2>
                </div>
            </div>
            <CountingUtilitiesPreview />
        </div>
    );
}
