'use client';

import Editor from '@monaco-editor/react';

type CodePreviewProps = {
    code: string;
    language?: string;
};

export function CodePreview(props: CodePreviewProps) {
    const { code, language } = props;
    return (
        <div style={{ width: '100%', height: 300 }}>
            <Editor
                language={language || 'javascript'}
                className="w-full h-full"
                value={code}
                options={{ readOnly: true, minimap: { enabled: false } }}
            />
        </div>
    );
}
