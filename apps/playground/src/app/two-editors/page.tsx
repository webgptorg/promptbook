'use client';

import { ResizablePanelsAuto } from '@common/components/ResizablePanelsAuto/ResizablePanelsAuto';
import { BookEditor } from '@promptbook-local/components';
import { DEFAULT_BOOK } from '@promptbook-local/core';
import type { string_book } from '@promptbook-local/types';
import { useState } from 'react';

export default function TwoEditorsPage() {
    const [book, setBook] = useState<string_book>(DEFAULT_BOOK);

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
            </ResizablePanelsAuto>
        </div>
    );
}
