'use client';

import { BookEditor } from '@promptbook-local/components';
import { DEFAULT_BOOK } from '@promptbook-local/core';
import type { string_book } from '@promptbook-local/types';
import { useState } from 'react';

export default function SyncPage() {
    const [book, setBook] = useState<string_book>(DEFAULT_BOOK);

    const sync = {
        serverUrl: 'ws://localhost:1234',
        roomName: 'promptbook-sync-room',
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
            <div className="w-1/2 h-screen">
                <BookEditor
                    value={book}
                    onChange={(book) => {
                        console.log('Book changed in editor 1');
                        setBook(book);
                    }}
                    isBorderRadiusDisabled={true}
                    style={{
                        width: `100%`,
                        height: `100%`,
                    }}
                    isVerbose={false}
                    onFileUpload={(file) => {
                        return `[${file.name}]`;
                    }}
                    sync={sync}
                />
            </div>
            <div className="w-1/2 h-screen">
                <BookEditor
                    value={book}
                    onChange={(book) => {
                        console.log('Book changed in editor 2');
                        setBook(book);
                    }}
                    isBorderRadiusDisabled={true}
                    style={{
                        width: `100%`,
                        height: `100%`,
                    }}
                    isVerbose={false}
                    onFileUpload={(file) => {
                        return `[${file.name}]`;
                    }}
                    sync={sync}
                />
            </div>
        </div>
    );
}
