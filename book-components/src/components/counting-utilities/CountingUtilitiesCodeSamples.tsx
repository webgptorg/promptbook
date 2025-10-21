import { Code as CodeIcon } from 'lucide-react';
import { Code } from '../Code/Code';

export default function CountingUtilitiesCodeSamples() {
    const samples = [
        {
            name: 'Characters',
            code: `import { countCharacters } from '@promptbook/utils';\n\ncountCharacters('Hello World');`,
        },
        {
            name: 'Words',
            code: `import { countWords } from '@promptbook/utils';\n\ncountWords('Hello World');`,
        },
        {
            name: 'Sentences',
            code: `import { countSentences } from '@promptbook/utils';\n\ncountSentences('Hello World. How are you?');`,
        },
        {
            name: 'Paragraphs',
            code: `import { countParagraphs } from '@promptbook/utils';\n\ncountParagraphs('Hello World.\\n\\nHow are you?');`,
        },
        {
            name: 'Lines',
            code: `import { countLines } from '@promptbook/utils';\n\ncountLines('Hello World.\\nHow are you?');`,
        },
        {
            name: 'Pages',
            code: `import { countPages } from '@promptbook/utils';\n\ncountPages('...');`,
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
