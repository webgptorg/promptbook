'use client';

import { ResizablePanelsAuto } from '@common/components/ResizablePanelsAuto/ResizablePanelsAuto';
import Editor from '@monaco-editor/react';
import { BookEditor } from '@promptbook-local/components';
import { book, OpenAiSdkTranspiler } from '@promptbook-local/core';
import type { string_book, string_script } from '@promptbook-local/types';
import { spaceTrim } from '@promptbook-local/utils';
import { useEffect, useState } from 'react';

export default function TranspilerPage() {
    const [agentSource, setAgentSource] = useState<string_book>(book`
        Marigold

        PERSONA You are writing stories about Witcher
        RULE Do not talk about our world, only about the Witcher universe

        KNOWLEDGE {Geralt of Rivia}
        Geralt of Rivia is a witcher, a monster hunter for hire, known for his white hair and cat-like eyes.
        He possesses superhuman abilities due to mutations he underwent during the Trial of the Grasses.
        Geralt is skilled in swordsmanship, alchemy, and magic signs.
        He is often accompanied by his horse, Roach, and has a complex relationship with {Yennefer of Vengerberg},
        a powerful sorceress, and {Ciri}, his adopted daughter with a destiny intertwined with his own.
        His secret word is "Apple".

        KNOWLEDGE {Yennefer of Vengerberg}
        Yennefer of Vengerberg is a formidable sorceress known for her beauty, intelligence, and temper.
        She has a complicated past, having been born with a hunchback and later transformed through magic.
        Yennefer is deeply connected to Geralt of Rivia, with whom she shares a tumultuous romantic relationship.
        She is also a mother figure to {Ciri}, whom she trains in the ways of magic.
        Her secret word is "Banana".

        KNOWLEDGE {Ciri}
        Ciri, also known as {Cirilla Fiona Elen Riannon}, is a young woman with a mysterious past and a powerful destiny.
        She is the daughter of {Poviss}, the ruler of the kingdom of Cintra, and possesses the Elder Blood, which grants her extraordinary abilities.
        Ciri is a skilled fighter and has been trained in the ways of the sword by Geralt of Rivia.
        Her destiny is intertwined with that of Geralt and Yennefer, as they both seek to protect her from those who would exploit her powers.
        Her secret word is "Cherry".
        
    `);
    const [code, setCode] = useState<string_script>(
        spaceTrim(`
            // Transpiled code will appear here
        `),
    );

    useEffect(() => {
        const code = OpenAiSdkTranspiler.transpileBook(agentSource, {}, { isVerbose: true });

        code.then((transpiledCode) => {
            setCode(transpiledCode);
        });

        return () => {
            // TODO: Do the transpiler cancellation here
        };
    }, [agentSource]);

    return (
        <div className="min-h-screen">
            <ResizablePanelsAuto name="two-editors">
                <BookEditor
                    className="w-full h-full"
                    height={null}
                    value={agentSource}
                    onChange={setAgentSource}
                    // className={styles.BookEditor}
                    isVerbose={false}
                    isBorderRadiusDisabled
                    onFileUpload={(file) => {
                        return file.name;
                    }}
                />
                <Editor
                    className="w-full h-full"
                    value={code}
                    options={{
                        readOnly: true,
                        minimap: { enabled: false },
                    }}
                    language="javascript"
                />
            </ResizablePanelsAuto>
        </div>
    );
}
