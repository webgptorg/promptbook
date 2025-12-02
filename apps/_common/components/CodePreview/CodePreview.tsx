'use client';

import Editor from '@monaco-editor/react';

type CodePreviewProps = {
    code: string;
};

export function CodePreview(props: CodePreviewProps) {
    const { code } = props;
    return <Editor language="javascript" className={`w-full h-full`} value={code} />;
}
