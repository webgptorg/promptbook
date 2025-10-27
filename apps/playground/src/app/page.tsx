'use client';

import { BookEditor } from '@promptbook-local/components';
import { DEFAULT_BOOK } from '@promptbook-local/core';
import type { string_book } from '@promptbook-local/types';
import { useState } from 'react';

export default function HomePage() {
    const [book, setBook] = useState<string_book>(DEFAULT_BOOK);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <BookEditor
                value={book}
                onChange={(book) => {
                    console.log('Book changed');
                    setBook(book);
                }}
                isBorderRadiusDisabled={false}
                style={{
                    width: `100vw`,
                    height: `100vh`,
                }}
                // className={styles.BookEditor}
                isVerbose={false}
                onFileUpload={(file) => {
                    return `[${file.name}]`;
                }}
                // isReadonly
                translations={{ readonlyMessage: 'aaaaa' }}
            />
        </div>
    );
}
