import { Code as CodeIcon } from 'lucide-react';
import { spaceTrim } from 'spacetrim';
import { Code } from '../Code/Code';

/**
 * Handles counting utilities code samples.
 */
export default function CountingUtilitiesCodeSamples() {
    const samples = [
        {
            name: 'Characters',
            code: spaceTrim(`
                import { countCharacters } from '@promptbook/utils';

                countCharacters('Hello World');
            `),
        },
        {
            name: 'Words',
            code: spaceTrim(`
                import { countWords } from '@promptbook/utils';

                countWords('Hello World');
            `),
        },
        {
            name: 'Sentences',
            code: spaceTrim(`
                import { countSentences } from '@promptbook/utils';

                countSentences('Hello World. How are you?');
            `),
        },
        {
            name: 'Paragraphs',
            code: spaceTrim(`
                import { countParagraphs } from '@promptbook/utils';

                countParagraphs('Hello World.\\n\\nHow are you?');
            `),
        },
        {
            name: 'Lines',
            code: spaceTrim(`
                import { countLines } from '@promptbook/utils';

                countLines('Hello World.\\nHow are you?');
            `),
        },
        {
            name: 'Pages',
            code: spaceTrim(`
                import { countPages } from '@promptbook/utils';

                countPages('...');
            `),
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
