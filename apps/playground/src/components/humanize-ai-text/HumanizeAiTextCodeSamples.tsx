import { Code as CodeIcon } from 'lucide-react';
import { Code } from '../Code/Code';

export default function HumanizeAiTextCodeSamples() {
    const samples = [
        {
            name: 'Humanize AI Text',
            code: `import { humanizeAiText } from '@promptbook/utils';\n\nhumanizeAiText('Hello World');`,
        },
    ];

    return (
        <div className="bg-white rounded-lg shadow-md">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <CodeIcon className="h-5 w-5 mr-2" />
                    Usage
                </h2>
            </div>
            <div className="p-6 space-y-6">
                {samples.map((sample) => (
                    <div key={sample.name}>
                        <h3 className="text-md font-semibold text-gray-800 mb-2">{sample.name}</h3>
                        <Code content={sample.code} />
                    </div>
                ))}
            </div>
        </div>
    );
}
