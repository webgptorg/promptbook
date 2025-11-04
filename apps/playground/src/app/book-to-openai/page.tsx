'use client';

import { ResizablePanelsAuto } from '@common/components/ResizablePanelsAuto/ResizablePanelsAuto';
import Editor from '@monaco-editor/react';
import { BookEditor } from '@promptbook-local/components';
import { DEFAULT_BOOK, OpenAiSdkTranspiler } from '@promptbook-local/core';
import type { string_book, string_script } from '@promptbook-local/types';
import { spaceTrim } from '@promptbook-local/utils';
import { useEffect, useState } from 'react';

export default function TranspilerPage() {
    const [book, setBook] = useState<string_book>(DEFAULT_BOOK);
    const [code, setCode] = useState<string_script>(
        spaceTrim(`
            // Transpiled code will appear here
        `),
    );

    useEffect(() => {
        const code = OpenAiSdkTranspiler.transpileBook(book, {}, { isVerbose: true });

        code.then((transpiledCode) => {
            setCode(transpiledCode);
        });

        return () => {
            // TODO: Do the transpiler cancellation here
        };
    }, [book]);

    return (
        <div className="min-h-screen">
            <ResizablePanelsAuto name="two-editors">
                <BookEditor
                    className="w-full h-full"
                    height={null}
                    value={book}
                    onChange={setBook}
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
