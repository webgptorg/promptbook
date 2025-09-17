import React, { useState } from 'react';
import { BookEditor } from './src/book-components/BookEditor/BookEditor';
import { validateBook } from './src/book-2.0/agent-source/string_book';
import type { string_book } from './src/book-2.0/agent-source/string_book';

function TestBookEditorFileUpload() {
    const [content, setContent] = useState<string_book>(validateBook('# Test Book\n\nDrop files here to test upload functionality.'));

    // Dummy implementation that returns a mock URL
    const handleFileUpload = async (file: File): Promise<string> => {
        console.log('File uploaded:', file.name, file.size, file.type);
        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Return mock CDN URL
        return `https://cdn.example.com/files/${file.name}`;
    };

    return (
        <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h1>BookEditor File Upload Test</h1>
            <p>Drop files onto the editor below to test the file upload functionality:</p>
            <div style={{ border: '2px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                <BookEditor
                    value={content}
                    onChange={setContent}
                    onFileUpload={handleFileUpload}
                    isVerbose={true}
                />
            </div>

            <div style={{ marginTop: '20px' }}>
                <h3>Current Content:</h3>
                <pre style={{
                    background: '#f5f5f5',
                    padding: '10px',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflow: 'auto'
                }}>
                    {content}
                </pre>
            </div>

            <div style={{ marginTop: '20px' }}>
                <h3>Test Instructions:</h3>
                <ol>
                    <li>Place cursor somewhere in the editor</li>
                    <li>Drag and drop one or more files onto the editor</li>
                    <li>Observe that mock URLs (e.g., "https://cdn.example.com/files/filename.ext") are inserted at cursor position</li>
                    <li>Multiple files should result in multiple URLs separated by spaces</li>
                    <li>Check console for upload logs</li>
                </ol>
            </div>
        </div>
    );
}

export default TestBookEditorFileUpload;
